import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { getCurrentTableSession } from "@/lib/tableSessions";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPublicAppUrl } from "@/lib/appUrl";
import { calculateTaxBreakdown, getTaxRates, taxSummary } from "@/lib/taxes";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/bills
 * List all finalized and paid bills with pagination (10 per page default).
 */
export async function GET(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10));
    const search = (url.searchParams.get("search") ?? "").trim();
    const paymentMethod = url.searchParams.get("paymentMethod") ?? "all";
    const exportAll = url.searchParams.get("export") === "true";

    const whereClause: any = { restaurantId };

    if (search) {
      const searchNum = parseInt(search, 10);
      whereClause.OR = [
        { tableLabel: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        ...(!isNaN(searchNum) ? [{ billNumber: searchNum }] : []),
      ];
    }

    if (paymentMethod && paymentMethod !== "all") {
      whereClause.paymentMethod = paymentMethod.toUpperCase();
    }

    const totalBills = await db.bill.count({ where: whereClause });
    const totalRevenueAgg = await db.bill.aggregate({
      where: { restaurantId, paymentStatus: "PAID" },
      _sum: { totalCents: true },
    });
    const totalRevenueCents = totalRevenueAgg._sum.totalCents ?? 0;

    if (exportAll) {
      const allBills = await db.bill.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      });
      return Response.json({
        bills: allBills,
        total: totalBills,
        totalRevenueCents,
      });
    }

    const totalPages = Math.ceil(totalBills / limit) || 1;
    const bills = await db.bill.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return Response.json({
      bills,
      pagination: {
        page,
        limit,
        total: totalBills,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      totalRevenueCents,
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

/**
 * POST /api/admin/bills
 * Save finalized bill & confirmed payment into the database.
 * Releases the table as Available and marks TableSession as finalized.
 */
export async function POST(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const body = await req.json();
    const {
      tableId,
      tableSessionId,
      tableLabel,
      customerName,
      customerPhone,
      customerEmail,
      orderCount,
      subtotalCents,
      discountCents,
      discountPercent,
      discountName,
      taxCents,
      taxPercent,
      taxName,
      packingCents,
      totalCents,
      paymentMethod,
      items,
    } = body;

    if (!tableId || !tableSessionId || !tableLabel) {
      return Response.json({ error: "A current table session is required to settle this bill" }, { status: 400 });
    }

    // Re-read and price the active session on the server while holding the same
    // table lock used by QR orders. A stale browser tab cannot settle an old tab
    // or submit a client-edited total.
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tableId}))::text AS "locked"`;
      const currentSession = await getCurrentTableSession(tx, tableId, restaurantId);
      if (!currentSession || currentSession.id !== tableSessionId) {
        return { error: "This table session has expired or was already settled." } as const;
      }

      const [activeSession, table, restaurant] = await Promise.all([
        tx.tableSession.findFirst({
          where: { id: tableSessionId, tableId, restaurantId, status: "OPEN" },
          include: { orders: { where: { status: { not: "CANCELLED" } }, include: { items: true }, orderBy: { createdAt: "asc" } } },
        }),
        tx.table.findFirst({ where: { id: tableId, restaurantId }, select: { label: true } }),
        tx.restaurant.findUnique({ where: { id: restaurantId }, select: { taxName: true, taxPercent: true, additionalTaxes: true, discountActive: true, discountPercent: true, discountName: true } }),
      ]);
      if (!activeSession || !table || !restaurant || activeSession.orders.length === 0) {
        return { error: "There are no active orders to settle for this table." } as const;
      }
      const itemMap = new Map<string, { name: string; unitPrice: number; quantity: number; subtotal: number }>();
      for (const order of activeSession.orders) {
        for (const item of order.items) {
          const servedQuantity = Math.max(0, Math.min(item.quantity, item.servedQuantity));
          if (servedQuantity < 1) continue;
          const key = `${item.nameSnapshot}:${item.priceCentsSnapshot}`;
          const line = itemMap.get(key) ?? { name: item.nameSnapshot, unitPrice: item.priceCentsSnapshot, quantity: 0, subtotal: 0 };
          line.quantity += servedQuantity;
          line.subtotal += item.priceCentsSnapshot * servedQuantity;
          itemMap.set(key, line);
        }
      }
      const items = [...itemMap.values()];
      if (!items.length) return { error: "There are no served items to bill yet." } as const;
      const subtotalCents = items.reduce((sum, item) => sum + item.subtotal, 0);
      const discountPercent = restaurant.discountActive ? restaurant.discountPercent ?? 0 : 0;
      const discountCents = Math.round(subtotalCents * discountPercent / 100);
      const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
      const taxBreakdown = calculateTaxBreakdown(discountedSubtotal, getTaxRates(restaurant.taxName, restaurant.taxPercent, restaurant.additionalTaxes));
      const { taxPercent, taxName, taxCents } = taxSummary(taxBreakdown);
      const packingCents = subtotalCents > 0 ? 2000 : 0;
      const totalCents = discountedSubtotal + taxCents + packingCents;

      const previousBill = await tx.bill.findFirst({
        where: { restaurantId, tableSessionId },
        orderBy: { createdAt: "desc" },
      });
      if (previousBill?.paymentStatus === "PAID") return { error: "This table session is already paid." } as const;
      if (!(customerPhone || previousBill?.customerPhone || activeSession.orders.find((order) => order.customerPhone)?.customerPhone) && !(customerEmail || previousBill?.customerEmail || activeSession.orders.find((order) => order.customerEmail)?.customerEmail)) {
        return { error: "Enter a customer phone number or email address before settling the bill." } as const;
      }

      // Serialize bill-number allocation across tables in the same restaurant.
      await tx.$queryRaw`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`;
      let bill;
      const now = new Date();
      const billFields = {
        tableId: tableId || null,
        tableLabel: table.label,
        customerName: customerName || previousBill?.customerName || null,
        customerPhone: customerPhone || previousBill?.customerPhone || null,
        customerEmail: customerEmail || previousBill?.customerEmail || null,
        orderCount: new Set(activeSession.orders.filter((order) => order.items.some((item) => item.servedQuantity > 0)).map((order) => order.id)).size,
        subtotalCents,
        discountCents,
        discountPercent,
        discountName: discountPercent > 0 ? restaurant.discountName ?? "Special Offer" : null,
        taxCents,
        taxPercent,
        taxName,
        taxBreakdown,
        packingCents,
        totalCents,
        paymentMethod: (paymentMethod || "CASH").toUpperCase(),
        paymentStatus: "PAID",
        paidAt: now,
        itemsJson: JSON.stringify(items),
      };
      if (previousBill) {
        bill = await tx.bill.update({
          where: { id: previousBill.id },
          data: {
            shareToken: previousBill.shareToken || randomBytes(32).toString("base64url"),
            ...billFields,
          },
        });
      } else {
        const lastBill = await tx.bill.findFirst({ where: { restaurantId }, orderBy: { billNumber: "desc" }, select: { billNumber: true } });
        bill = await tx.bill.create({
          data: {
            restaurantId,
            tableSessionId,
            billNumber: (lastBill?.billNumber ?? 1000) + 1,
            shareToken: randomBytes(32).toString("base64url"),
            ...billFields,
          },
        });
      }

      // If open session exists, mark as finalized and paid
      await tx.tableSession.update({
        where: { id: tableSessionId },
        data: { status: "FINALIZED", finalizedAt: new Date(), paidAt: new Date(), billRequestedAt: null },
      });
      const resolvedBillRequest = await tx.serviceRequest.updateMany({
        where: { restaurantId, tableSessionId, requests: { has: "pay_bill" }, status: { in: ["PENDING", "IN_PROGRESS"] } },
        data: { status: "COMPLETED" },
      });
      const unservedOrders = await tx.order.findMany({
        where: { tableSessionId, restaurantId, status: { in: ["NEW", "ACCEPTED", "PREPARING", "READY"] } },
        select: { id: true },
      });
      if (unservedOrders.length) {
        const unservedOrderIds = unservedOrders.map((order) => order.id);
        await tx.order.updateMany({ where: { id: { in: unservedOrderIds } }, data: { status: "CANCELLED" } });
        await tx.$executeRaw`UPDATE "OrderItem" SET "cancelledQuantity" = GREATEST(0, "quantity" - "servedQuantity") WHERE "orderId" IN (${Prisma.join(unservedOrderIds)})`;
        await tx.orderStatusHistory.createMany({ data: unservedOrders.map((order) => ({ orderId: order.id, status: "CANCELLED" as const })) });
      }

      // Mark table Available again and complete any remaining active orders
      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: "AVAILABLE" },
        });

      }

      return { bill, resolvedBillRequest: resolvedBillRequest.count > 0 } as const;
    }, { maxWait: 10000, timeout: 20000 });
    if ("error" in result) return Response.json({ error: result.error }, { status: 409 });
    const createdBill = result.bill;

    // Real-time broadcast to admin panel and tables
    const { emitOrderEvent } = await import("@/lib/events");
    void emitOrderEvent({
      restaurantId,
      type: "bill_updated",
      data: {
        billId: createdBill.id,
        tableId: createdBill.tableId,
        tableSessionId: createdBill.tableSessionId,
        shareToken: createdBill.shareToken,
      },
    });
    if (result.resolvedBillRequest) {
      const request = await db.serviceRequest.findFirst({ where: { restaurantId, tableSessionId: createdBill.tableSessionId, requests: { has: "pay_bill" }, status: "COMPLETED" }, orderBy: { updatedAt: "desc" }, select: { id: true, tableId: true, tableSessionId: true, tableLabel: true, requests: true, custom: true, status: true, createdAt: true } });
      if (request) void emitOrderEvent({ restaurantId, type: "service_request_updated", data: { request } });
    }
    return Response.json({ bill: createdBill, billUrl: createdBill.shareToken ? `${getPublicAppUrl(req.url)}/bill/${createdBill.shareToken}` : null }, { status: 201 });
  } catch (err) {
    console.error("[bills:create]", err);
    return tenantErrorResponse(err);
  }
}
