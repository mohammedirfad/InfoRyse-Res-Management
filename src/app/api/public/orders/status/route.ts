import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/orders/status?idempotencyKey=…&slug=…&qrToken=…
 *
 * Safety net for the guest checkout. If the browser loses the HTTP response of
 * a successful POST /api/public/orders (mobile network drop, tab throttled,
 * navigation racing the fetch) the guest must NOT be told "try again" for an
 * order that already reached the kitchen.
 *
 * The lookup is scoped to the table the QR token belongs to, so a key can only
 * ever reveal an order placed at that physical table.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const idempotencyKey = url.searchParams.get("idempotencyKey")?.trim();
    const slug = url.searchParams.get("slug")?.trim();
    const qrToken = url.searchParams.get("qrToken");
    if (!idempotencyKey || !slug || !qrToken) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    const table = await db.table.findFirst({
      where: { qrToken, deletedAt: null, restaurant: { slug, isActive: true } },
      select: { id: true, restaurantId: true },
    });
    if (!table)
      return Response.json({ error: "Invalid QR code" }, { status: 404 });

    const order = await db.order.findFirst({
      where: {
        idempotencyKey,
        restaurantId: table.restaurantId,
        tableId: table.id,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalCents: true,
        customerName: true,
        createdAt: true,
        tableSessionId: true,
      },
    });

    if (!order)
      return Response.json(
        { order: null },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    return Response.json(
      { order, tableSessionId: order.tableSessionId },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    console.error("[order:status]", error);
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
}
