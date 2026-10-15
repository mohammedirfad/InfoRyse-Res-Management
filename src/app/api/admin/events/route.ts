import { requireRestaurantUser } from "@/lib/tenant";
import { orderEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Initial connection event
    writer.write(encoder.encode(`event: connected\ndata: ${JSON.stringify({ ok: true, restaurantId })}\n\n`));

    const onEvent = (payload: { restaurantId: string; type: string; data?: any }) => {
      if (payload.restaurantId === restaurantId) {
        writer.write(
          encoder.encode(`event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`)
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
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
