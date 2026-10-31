import { db } from "@/lib/db";
import { getCurrentTableSession } from "@/lib/tableSessions";
import { calculateTaxBreakdown, getTaxRates, taxSummary } from "@/lib/taxes";

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
    const requestedSessionId = url.searchParams.get("sessionId");

    if (!slug || !qrToken) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const table = await db.table.findFirst({
      where: { qrToken, restaurant: { slug }, deletedAt: null },
      select: {
        id: true,
        label: true,
        status: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            taxPercent: true,
            taxName: true,
            additionalTaxes: true,
            discountActive: true,
            discountPercent: true,
            discountName: true,
          },
        },
      },
    });
    if (!table) {
      return Response.json({ error: "Table not found" }, { status: 404 });
    }
    const restaurant = table.restaurant;
    const publicTable = { id: table.id, label: table.label, status: table.status };

    // Find the currently open TableSession for this table
    const currentSession = requestedSessionId
      ? await db.tableSession.findFirst({ where: { id: requestedSessionId, tableId: table.id, restaurantId: restaurant.id } })
      : await getCurrentTableSession(db, table.id, restaurant.id);
    let session = currentSession ? await db.tableSession.findUnique({
      where: { id: currentSession.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        billRequestedAt: true,
        orders: {
          where:   { status: { not: "CANCELLED" } },
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            status: true,
            createdAt: true,
            subtotalCents: true,
            items: {
              select: {
                id: true,
                nameSnapshot: true,
                priceCentsSnapshot: true,
                quantity: true,
                servedQuantity: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }) : null;

    // Resilient fallback: If no open session exists yet, check if there are recent unlinked active orders for this table
    if (!session && !requestedSessionId) {
      const recentOrders = await db.order.findMany({
        where: {
          tableId: table.id,
          restaurantId: restaurant.id,
          tableSessionId: null,
          status: { in: ["NEW", "ACCEPTED", "PREPARING", "READY"] },
          createdAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
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
      return Response.json({ table: publicTable, session: null, bill: null });
    }

    const activeBill = await db.bill.findFirst({
      where: { restaurantId: restaurant.id, tableId: table.id, tableSessionId: session.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tableSessionId: true,
        shareToken: true,
        billNumber: true,
        tableLabel: true,
        customerName: true,
        subtotalCents: true,
        discountCents: true,
        discountPercent: true,
        discountName: true,
        taxCents: true,
        taxPercent: true,
        taxName: true,
        taxBreakdown: true,
        packingCents: true,
        totalCents: true,
        paymentMethod: true,
        paymentStatus: true,
        itemsJson: true,
        createdAt: true,
        restaurant: { select: { name: true, contactPhone: true, contactEmail: true } },
      },
    });

    // Aggregate items across all rounds of orders placed at this table
    const allItems: Record<string, {
      name: string; unitPrice: number; quantity: number; subtotal: number;
    }> = {};

    for (const order of session.orders) {
      for (const item of order.items) {
        const servedQuantity = Math.max(0, Math.min(item.quantity, item.servedQuantity));
        if (servedQuantity < 1) continue;
        const key = `${item.nameSnapshot}:${item.priceCentsSnapshot}`;
        if (allItems[key]) {
          allItems[key].quantity += servedQuantity;
          allItems[key].subtotal += item.priceCentsSnapshot * servedQuantity;
        } else {
          allItems[key] = {
            name:      item.nameSnapshot,
            unitPrice: item.priceCentsSnapshot,
            quantity:  servedQuantity,
            subtotal:  item.priceCentsSnapshot * servedQuantity,
          };
        }
      }
    }

    const subtotalCents = Object.values(allItems).reduce((sum, item) => sum + item.subtotal, 0);
    const hasDiscount = Boolean(restaurant.discountActive && (restaurant.discountPercent ?? 0) > 0);
    const discountPercent = hasDiscount ? (restaurant.discountPercent ?? 0) : 0;
    const discountCents = hasDiscount ? Math.round(subtotalCents * (discountPercent / 100)) : 0;
    const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
    const taxBreakdown = calculateTaxBreakdown(discountedSubtotal, getTaxRates(restaurant.taxName, restaurant.taxPercent, restaurant.additionalTaxes));
    const { taxCents, taxName, taxPercent } = taxSummary(taxBreakdown);
    const totalCents = discountedSubtotal > 0 ? (discountedSubtotal + taxCents + PACKING_CENTS) : 0;

    return new Response(
      JSON.stringify({
        table: publicTable,
        session: {
          id:           session.id,
          status:       session.status,
          createdAt:    session.createdAt,
          billRequestedAt: session.billRequestedAt,
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
          taxName,
          taxPercent,
          taxBreakdown,
          packingCents: subtotalCents > 0 ? PACKING_CENTS : 0,
          totalCents,
        },
        bill: activeBill,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (err) {
    console.error("[public:table-orders]", err);
    return Response.json({ error: "Failed to fetch table orders" }, { status: 500 });
  }
}
