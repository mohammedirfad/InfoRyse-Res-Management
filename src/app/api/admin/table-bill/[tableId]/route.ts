import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

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

    const table = await db.table.findFirst({
      where: { id: params.tableId, restaurantId },
      select: { id: true, label: true, section: true, status: true },
    });
    if (!table) return Response.json({ error: "Table not found" }, { status: 404 });

    // Get the currently open session
    const session = await db.tableSession.findFirst({
      where:   { tableId: params.tableId, restaurantId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          where:   { status: { not: "CANCELLED" } },
          include: { items: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return Response.json({ session: null, table });
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

    const subtotal = Object.values(allItems).reduce((s, i) => s + i.subtotal, 0);

    return Response.json({
      session: {
        id:           session.id,
        status:       session.status,
        createdAt:    session.createdAt,
        orderCount:   session.orders.length,
        orders:       session.orders.map(o => ({
          id:           o.id,
          orderNumber:  o.orderNumber,
          status:       o.status,
          createdAt:    o.createdAt,
          customerName: o.customerName,
          subtotal:     o.subtotalCents,
          items:        o.items,
        })),
        aggregatedItems: Object.values(allItems),
        subtotalCents: subtotal,
      },
      table,
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
