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
const restaurantSlugCache = new Map<string, { id: string; ts: number }>();
const SLUG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim();
  const rawOrderNumber = url.searchParams.get("orderNumber") || "";
  const orderNumber = parseInt(rawOrderNumber.replace(/\D/g, ""), 10);

  if (!slug || isNaN(orderNumber)) {
    return Response.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    let restaurantId: string | null = null;
    const now = Date.now();
    const cached = restaurantSlugCache.get(slug);

    if (cached && now - cached.ts < SLUG_CACHE_TTL) {
      restaurantId = cached.id;
    } else {
      const restaurant = await db.restaurant.findUnique({
        where:  { slug },
        select: { id: true },
      });
      if (restaurant) {
        restaurantId = restaurant.id;
        restaurantSlugCache.set(slug, { id: restaurant.id, ts: now });
      }
    }

    if (!restaurantId) {
      return Response.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const order = await db.order.findFirst({
      where:  { restaurantId, orderNumber },
      select: { status: true, createdAt: true },
    });

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    // Short cache — 4s is fine; client polls every 5-12s anyway
    return new Response(JSON.stringify({ status: order.status, updatedAt: order.createdAt }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[order-status]", err);
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
}
