import { db } from "@/lib/db";
import { createRealtimeEventStream } from "@/lib/supabaseRealtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim();
  const qrToken = url.searchParams.get("qrToken");
  const rawOrderNumber = url.searchParams.get("orderNumber");
  const orderNumber = rawOrderNumber ? Number.parseInt(rawOrderNumber, 10) : null;
  if (!slug || (!qrToken && (!orderNumber || !Number.isFinite(orderNumber)))) {
    return Response.json({ error: "Invalid event stream parameters" }, { status: 400 });
  }

  try {
    let tableId: string | null = null;
    let restaurantId: string | null = null;
    let snapshot: { orderNumber: number; status: string } | undefined;
    if (qrToken) {
      const table = await db.table.findFirst({
        where: { qrToken, deletedAt: null, restaurant: { slug, isActive: true } },
        select: {
          id: true,
          restaurantId: true,
          ...(orderNumber ? {
            orders: {
              where: { orderNumber },
              select: { orderNumber: true, status: true },
              take: 1,
            },
          } : {}),
        },
      });
      tableId = table?.id ?? null;
      restaurantId = table?.restaurantId ?? null;
      if (orderNumber && table && "orders" in table && table.orders[0]) {
        snapshot = { orderNumber: table.orders[0].orderNumber, status: table.orders[0].status };
      }
      if (orderNumber && table && !snapshot) return Response.json({ error: "Order not found at this table" }, { status: 404 });
    } else if (orderNumber) {
      const order = await db.order.findFirst({
        where: { orderNumber, restaurant: { slug, isActive: true } },
        select: { tableId: true, restaurantId: true, orderNumber: true, status: true },
      });
      tableId = order?.tableId ?? null;
      restaurantId = order?.restaurantId ?? null;
      if (order) snapshot = { orderNumber: order.orderNumber, status: order.status };
    }

    if (!tableId || !restaurantId) return Response.json({ error: "Table or order not found" }, { status: 404 });
    return createRealtimeEventStream(req, `table:${restaurantId}:${tableId}`, true, snapshot);
  } catch (error) {
    console.error("[public:order-events]", error);
    return Response.json({ error: "Could not open order event stream" }, { status: 503 });
  }
}
