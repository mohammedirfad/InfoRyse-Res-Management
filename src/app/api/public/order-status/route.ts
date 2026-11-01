import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Minimal status snapshot, scoped to the table QR that placed the order. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim();
  const qrToken = url.searchParams.get("qrToken");
  const rawOrderNumber = url.searchParams.get("orderNumber") || "";
  const orderNumber = Number.parseInt(rawOrderNumber.replace(/\D/g, ""), 10);

  if (!slug || !qrToken || !Number.isSafeInteger(orderNumber) || orderNumber < 1) {
    return Response.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const order = await db.order.findFirst({
      where: {
        orderNumber,
        restaurant: { slug, isActive: true },
        table: { qrToken, deletedAt: null },
      },
      select: { status: true, createdAt: true, restaurantId: true, tableId: true, tableSessionId: true },
    });
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

    const [bill, billableItem] = order.tableSessionId ? await Promise.all([
      db.bill.findFirst({
        where: {
          restaurantId: order.restaurantId,
          tableId: order.tableId,
          tableSessionId: order.tableSessionId,
          shareToken: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: { shareToken: true },
      }),
      db.orderItem.findFirst({
        where: {
          servedQuantity: { gt: 0 },
          order: { restaurantId: order.restaurantId, tableSessionId: order.tableSessionId, status: { not: "CANCELLED" } },
        },
        select: { id: true },
      }),
    ]) : [null, null];

    return Response.json({
      status: order.status,
      updatedAt: order.createdAt,
      tableSessionId: order.tableSessionId,
      billShareToken: bill?.shareToken ?? null,
      hasBillableItems: Boolean(billableItem),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[order-status]", error);
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
}
