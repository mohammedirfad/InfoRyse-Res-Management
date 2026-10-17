import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

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

    if (!tableLabel || totalCents === undefined) {
      return Response.json({ error: "Missing required bill details" }, { status: 400 });
    }

    // Run in transaction to allocate sequential billNumber and close session & table
    const createdBill = await db.$transaction(async (tx) => {
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
          tableLabel,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          orderCount: orderCount || 1,
          subtotalCents: subtotalCents || 0,
          discountCents: discountCents || 0,
          discountPercent: discountPercent || 0,
          discountName: discountName || null,
          taxCents: taxCents || 0,
          taxPercent: taxPercent || 5,
          taxName: taxName || "GST",
          packingCents: packingCents || 0,
          totalCents: totalCents || 0,
          paymentMethod: (paymentMethod || "CASH").toUpperCase(),
          paymentStatus: "PAID",
          paidAt: new Date(),
          itemsJson: JSON.stringify(items || []),
        },
      });

      // If open session exists, mark as finalized and paid
      if (tableSessionId) {
        await tx.tableSession.updateMany({
          where: { id: tableSessionId, restaurantId },
          data: {
            status: "FINALIZED",
            finalizedAt: new Date(),
            paidAt: new Date(),
          },
        });

        // Mark all confirmed orders in this session as COMPLETED so they are closed
        await tx.order.updateMany({
          where: { tableSessionId, restaurantId, status: { not: "CANCELLED" } },
          data: { status: "COMPLETED" },
        });
      }

      // Mark table Available again and complete any remaining active orders
      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: "AVAILABLE" },
        });

        // Mark any remaining active orders for this table as COMPLETED
        await tx.order.updateMany({
          where: { tableId, restaurantId, status: { notIn: ["CANCELLED", "COMPLETED"] } },
          data: { status: "COMPLETED" },
        });

        // Finalize and close any remaining open sessions for this table
        await tx.tableSession.updateMany({
          where: { tableId, restaurantId, status: "OPEN" },
          data: {
            status: "FINALIZED",
            finalizedAt: new Date(),
            paidAt: new Date(),
          },
        });
      }

      return bill;
    });

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
