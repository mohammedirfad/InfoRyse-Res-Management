import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { getCurrentTableSession } from "@/lib/tableSessions";

export const dynamic = "force-dynamic";

const PACKING_CENTS = 2000;

/**
 * GET /api/admin/table-bill/{tableId}
 * Returns the open TableSession for a table with all its orders grouped.
 * Used by the admin bill panel to show the running tab for a table.
 */
export async function GET(
  _req: Request,
  { params }: { params: { tableId: string } }
) {
  try {
    const { restaurantId } = await requireRestaurantUser();

    const [table, restaurant] = await Promise.all([
      db.table.findFirst({
        where: { id: params.tableId, restaurantId },
        select: { id: true, label: true, section: true, status: true },
      }),
      db.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          name: true,
          taxName: true,
          taxPercent: true,
          discountActive: true,
          discountPercent: true,
          discountName: true,
        },
      }),
    ]);

    if (!table) return Response.json({ error: "Table not found" }, { status: 404 });

    // 1) Get the currently open session
    const currentSession = await getCurrentTableSession(db, params.tableId, restaurantId);
    let session = currentSession ? await db.tableSession.findUnique({
      where: { id: currentSession.id },
      include: {
        orders: {
          where:   { status: { not: "CANCELLED" } },
          include: { items: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }) : null;

    // 2) Resilient fallback: Only check if there are active unlinked orders placed for this table
    // (e.g. guest ordered directly before session was created). NEVER resurrect completed or cancelled orders!
    if (!session || session.orders.length === 0) {
      const recentOrders = await db.order.findMany({
        where: {
          tableId: params.tableId,
          restaurantId,
          tableSessionId: null,
          status: { in: ["NEW", "ACCEPTED", "PREPARING", "READY"] },
          createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      });

      if (recentOrders.length > 0) {
        if (!session) {
          const createdSession = await db.tableSession.create({
            data: { tableId: params.tableId, restaurantId, status: "OPEN" },
          });
          await db.order.updateMany({
            where: { id: { in: recentOrders.map((o) => o.id) } },
            data:  { tableSessionId: createdSession.id },
          });
          session = {
            ...createdSession,
            orders: recentOrders,
          } as any;
        } else {
          // Open session had 0 orders, link any unlinked active orders
          await db.order.updateMany({
            where: { id: { in: recentOrders.map((o) => o.id) } },
            data:  { tableSessionId: session.id },
          });
          session = {
            ...session,
            orders: recentOrders,
          } as any;
        }

        // Also ensure table status is OCCUPIED only if there are active uncompleted orders
        if (table.status !== "OCCUPIED") {
          await db.table.update({
            where: { id: table.id },
            data:  { status: "OCCUPIED" },
          });
          table.status = "OCCUPIED" as any;
        }
      }
    }

    if (!session || !session.orders || session.orders.length === 0) {
      return new Response(
        JSON.stringify({
          session: null,
          table,
          restaurant: {
            name: restaurant?.name ?? "Restaurant",
            taxName: restaurant?.taxName ?? "GST",
            taxPercent: restaurant?.taxPercent ?? 5,
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // Aggregate all items across all orders in this session
    const allItems: Record<string, {
      name: string; unitPrice: number; quantity: number; subtotal: number;
    }> = {};

    for (const order of session.orders) {
      for (const item of order.items) {
        const key = item.nameSnapshot + ":" + item.priceCentsSnapshot;
        if (allItems[key]) {
          allItems[key].quantity += item.quantity;
          allItems[key].subtotal += item.priceCentsSnapshot * item.quantity;
        } else {
          allItems[key] = {
            name:      item.nameSnapshot,
            unitPrice: item.priceCentsSnapshot,
            quantity:  item.quantity,
            subtotal:  item.priceCentsSnapshot * item.quantity,
          };
        }
      }
    }

    const subtotalCents = Object.values(allItems).reduce((s, i) => s + i.subtotal, 0);

    const hasDiscount = Boolean(restaurant?.discountActive && (restaurant?.discountPercent ?? 0) > 0);
    const discountPercent = hasDiscount ? (restaurant?.discountPercent ?? 0) : 0;
    const discountCents = hasDiscount ? Math.round(subtotalCents * (discountPercent / 100)) : 0;
    const discountedSubtotal = Math.max(0, subtotalCents - discountCents);

    const taxPercent = restaurant?.taxPercent ?? 5;
    const taxName = restaurant?.taxName ?? "GST";
    const taxCents = Math.round(discountedSubtotal * (taxPercent / 100));
    const packingCents = subtotalCents > 0 ? PACKING_CENTS : 0;
    const totalCents = discountedSubtotal + taxCents + packingCents;

    return new Response(
      JSON.stringify({
        session: {
          id:           session.id,
          status:       session.status,
          createdAt:    session.createdAt,
          billRequestedAt: session.billRequestedAt,
          orderCount:   session.orders.length,
          orders:       session.orders.map((o) => ({
            id:           o.id,
            orderNumber:  o.orderNumber,
            status:       o.status,
            createdAt:    o.createdAt,
            customerName: o.customerName,
            subtotal:     o.subtotalCents,
            items:        o.items,
          })),
          aggregatedItems: Object.values(allItems),
          subtotalCents,
          discountCents,
          discountPercent,
          discountName: hasDiscount ? (restaurant?.discountName ?? "Special Offer") : null,
          taxPercent,
          taxName,
          taxCents,
          packingCents,
          totalCents,
        },
        table,
        restaurant: {
          name: restaurant?.name ?? "Restaurant",
          taxName,
          taxPercent,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
