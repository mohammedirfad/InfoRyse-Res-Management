import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { getCurrentTableSession } from "@/lib/tableSessions";

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
        tx.restaurant.findUnique({ where: { id: restaurantId }, select: { taxName: true, taxPercent: true, discountActive: true, discountPercent: true, discountName: true } }),
      ]);
      if (!activeSession || !table || !restaurant || activeSession.orders.length === 0) {
        return { error: "There are no active orders to settle for this table." } as const;
      }

      const itemMap = new Map<string, { name: string; unitPrice: number; quantity: number; subtotal: number }>();
      for (const order of activeSession.orders) {
        for (const item of order.items) {
          const key = `${item.nameSnapshot}:${item.priceCentsSnapshot}`;
          const line = itemMap.get(key) ?? { name: item.nameSnapshot, unitPrice: item.priceCentsSnapshot, quantity: 0, subtotal: 0 };
          line.quantity += item.quantity;
          line.subtotal += item.priceCentsSnapshot * item.quantity;
          itemMap.set(key, line);
        }
      }
      const items = [...itemMap.values()];
      const subtotalCents = items.reduce((sum, item) => sum + item.subtotal, 0);
      const discountPercent = restaurant.discountActive ? restaurant.discountPercent ?? 0 : 0;
      const discountCents = Math.round(subtotalCents * discountPercent / 100);
      const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
      const taxPercent = restaurant.taxPercent ?? 5;
      const taxCents = Math.round(discountedSubtotal * taxPercent / 100);
      const packingCents = subtotalCents > 0 ? 2000 : 0;
      const totalCents = discountedSubtotal + taxCents + packingCents;

      // Serialize bill-number allocation across tables in the same restaurant.
      await tx.$queryRaw`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`;
      // Get next sequential bill number for this restaurant
      const lastBill = await tx.bill.findFirst({
        where: { restaurantId },
        orderBy: { billNumber: "desc" },
        select: { billNumber: true },
      });
      const nextBillNumber = (lastBill?.billNumber ?? 1000) + 1;

      // Create immutable Bill record
      const bill = await tx.bill.create({
        data: {
          restaurantId,
          tableId: tableId || null,
          tableSessionId: tableSessionId || null,
          billNumber: nextBillNumber,
          tableLabel: table.label,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          orderCount: activeSession.orders.length,
          subtotalCents,
          discountCents,
          discountPercent,
          discountName: discountPercent > 0 ? restaurant.discountName ?? "Special Offer" : null,
          taxCents,
          taxPercent,
          taxName: restaurant.taxName ?? "GST",
          packingCents,
          totalCents,
          paymentMethod: (paymentMethod || "CASH").toUpperCase(),
          paymentStatus: "PAID",
          paidAt: new Date(),
          itemsJson: JSON.stringify(items),
        },
      });

      // If open session exists, mark as finalized and paid
      await tx.tableSession.update({
        where: { id: tableSessionId },
        data: { status: "FINALIZED", finalizedAt: new Date(), paidAt: new Date() },
      });
      await tx.order.updateMany({
        where: { tableSessionId, restaurantId, status: { not: "CANCELLED" } },
        data: { status: "COMPLETED" },
      });

      // Mark table Available again and complete any remaining active orders
      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: "AVAILABLE" },
        });

      }

      return { bill } as const;
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: 409 });
    const createdBill = result.bill;

    // Real-time broadcast to admin panel and tables
    const { emitOrderEvent } = await import("@/lib/events");
    emitOrderEvent({
      restaurantId,
      type: "bill_updated",
      data: {
        billId: createdBill.id,
        tableId: createdBill.tableId,
        tableSessionId: createdBill.tableSessionId,
      },
    });
    if (createdBill.tableId) {
      emitOrderEvent({
        restaurantId,
        type: "order_updated",
        data: { tableId: createdBill.tableId },
      });
    }

    return Response.json({ bill: createdBill }, { status: 201 });
  } catch (err) {
    console.error("[bills:create]", err);
    return tenantErrorResponse(err);
  }
}
