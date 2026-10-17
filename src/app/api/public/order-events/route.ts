import { db } from "@/lib/db";
import { orderEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

const restaurantSlugCache = new Map<string, { id: string; ts: number }>();
const SLUG_CACHE_TTL = 5 * 60 * 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim();
  const rawOrderNumber = url.searchParams.get("orderNumber") || "";
  const orderNumber = parseInt(rawOrderNumber.replace(/\D/g, ""), 10);

  if (!slug || isNaN(orderNumber)) {
    return new Response(JSON.stringify({ error: "Invalid parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
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
      return new Response(JSON.stringify({ error: "Restaurant not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Initial greeting
    writer.write(encoder.encode(`event: connected\ndata: ${JSON.stringify({ ok: true, orderNumber })}\n\n`));

    const onEvent = (payload: { restaurantId: string; type: string; data?: any }) => {
      if (
        payload.restaurantId === restaurantId &&
        payload.type === "order_updated" &&
        payload.data &&
        (payload.data.orderNumber === orderNumber || Number(payload.data.orderNumber) === orderNumber)
      ) {
        writer.write(
          encoder.encode(`event: order_status\ndata: ${JSON.stringify({ status: payload.data.status })}\n\n`)
        );
      }
    };

    orderEvents.on("restaurant_event", onEvent);

    const heartbeat = setInterval(() => {
      try {
        writer.write(encoder.encode(": ping\n\n"));
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    req.signal.addEventListener("abort", () => {
      clearInterval(heartbeat);
      orderEvents.off("restaurant_event", onEvent);
      writer.close().catch(() => {});
    });

    return new Response(responseStream.readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[order-events:stream]", err);
    return new Response(JSON.stringify({ error: "Stream error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
