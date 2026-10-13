import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const TAX_RATE = 0.05;
const PACKING_CENTS = 2000;

/**
 * GET /api/public/table-orders?slug={slug}&qrToken={qrToken}
 *
 * Public endpoint for guests sitting at the same table to view their
 * live shared running tab. When Person 1, Person 2, or Person 3 order
 * from the same table (Table O2), all of them can see all rounds of orders
 * and the unified table bill in real-time.
 */
export async function GET(req: Request) {
  try {
    const url     = new URL(req.url);
    const slug    = url.searchParams.get("slug");
    const qrToken = url.searchParams.get("qrToken");

    if (!slug || !qrToken) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const restaurant = await db.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        taxPercent: true,
        taxName: true,
        discountActive: true,
        discountPercent: true,
        discountName: true,
      },
    });
    if (!restaurant) {
      return Response.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const table = await db.table.findFirst({
      where: { qrToken, restaurantId: restaurant.id, deletedAt: null },
      select: { id: true, label: true, status: true },
    });
    if (!table) {
      return Response.json({ error: "Table not found" }, { status: 404 });
    }

    // Find the currently open TableSession for this table
    let session = await db.tableSession.findFirst({
      where:   { tableId: table.id, restaurantId: restaurant.id, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          where:   { status: { not: "CANCELLED" } },
          include: { items: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Resilient fallback: If no open session exists yet, check if there are recent unlinked orders for this table
    if (!session) {
      const recentOrders = await db.order.findMany({
        where: {
          tableId: table.id,
          restaurantId: restaurant.id,
          tableSessionId: null,
          status: { notIn: ["CANCELLED"] },
          createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
        },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      });

      if (recentOrders.length > 0) {
        const createdSession = await db.tableSession.create({
          data: { tableId: table.id, restaurantId: restaurant.id, status: "OPEN" },
        });
        await db.order.updateMany({
          where: { id: { in: recentOrders.map((o) => o.id) } },
          data:  { tableSessionId: createdSession.id },
        });
        session = {
          ...createdSession,
          orders: recentOrders,
        } as any;
      }
    }

    if (!session) {
      return Response.json({
        table,
        session: null,
      });
    }

    // Aggregate items across all rounds of orders placed at this table
    const allItems: Record<string, {
      name: string; unitPrice: number; quantity: number; subtotal: number;
    }> = {};

    for (const order of session.orders) {
      for (const item of order.items) {
        const key = `${item.nameSnapshot}:${item.priceCentsSnapshot}`;
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

    const subtotalCents = Object.values(allItems).reduce((sum, item) => sum + item.subtotal, 0);
    const hasDiscount = Boolean(restaurant.discountActive && (restaurant.discountPercent ?? 0) > 0);
    const discountPercent = hasDiscount ? (restaurant.discountPercent ?? 0) : 0;
    const discountCents = hasDiscount ? Math.round(subtotalCents * (discountPercent / 100)) : 0;
    const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
    const taxRate = (restaurant.taxPercent ?? 5) / 100;
    const taxCents = Math.round(discountedSubtotal * taxRate);
    const totalCents = discountedSubtotal > 0 ? (discountedSubtotal + taxCents + PACKING_CENTS) : 0;

    return new Response(
      JSON.stringify({
        table,
        session: {
          id:           session.id,
          status:       session.status,
          createdAt:    session.createdAt,
          orderCount:   session.orders.length,
          orders:       session.orders.map((o) => ({
            id:           o.id,
            orderNumber:  o.orderNumber,
            customerName: o.customerName ?? "Guest",
            status:       o.status,
            createdAt:    o.createdAt,
            subtotalCents: o.subtotalCents,
            items:        o.items.map((i) => ({
              name:     i.nameSnapshot,
              price:    i.priceCentsSnapshot,
              quantity: i.quantity,
            })),
          })),
          aggregatedItems: Object.values(allItems),
          subtotalCents,
          discountCents,
          discountPercent,
          discountName: hasDiscount ? (restaurant.discountName ?? "Special Offer") : null,
          taxCents,
          packingCents: subtotalCents > 0 ? PACKING_CENTS : 0,
          totalCents,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3, stale-while-revalidate=6",
        },
      }
    );
  } catch (err) {
    console.error("[public:table-orders]", err);
    return Response.json({ error: "Failed to fetch table orders" }, { status: 500 });
  }
}
