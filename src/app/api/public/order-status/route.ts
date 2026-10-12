import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Lightweight public endpoint — returns only the status of a specific order.
 * Used by the customer confirmation page to poll for status updates.
 *
 * No auth required (order number is not secret — customers know their own).
 * Returns minimal data: just { status, updatedAt } — never exposes other data.
 *
 * Much faster than the full /api/admin/orders because:
 * - Single row lookup by orderNumber + restaurantSlug (both indexed)
 * - No includes (no items, no table, no statusHistory)
 * - Response is ~100 bytes vs ~5KB for the full order list
 */
export async function GET(req: Request) {
  const url         = new URL(req.url);
  const slug        = url.searchParams.get("slug");
  const orderNumber = Number(url.searchParams.get("orderNumber"));

  if (!slug || isNaN(orderNumber)) {
    return Response.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const restaurant = await db.restaurant.findUnique({
      where:  { slug },
      select: { id: true },
    });

    if (!restaurant) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const order = await db.order.findFirst({
      where:  { restaurantId: restaurant.id, orderNumber },
      select: { status: true, createdAt: true },
    });

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    // Short cache — 4s is fine; client polls every 5-12s anyway
    return new Response(JSON.stringify({ status: order.status, updatedAt: order.createdAt }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=4, stale-while-revalidate=8",
      },
    });
  } catch (err) {
    console.error("[order-status]", err);
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
}
