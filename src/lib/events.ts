import { broadcastOrderEvent } from "@/lib/supabaseRealtime";
import { waitUntil } from "@vercel/functions";

export type OrderEventType =
  | "order_created"
  | "order_updated"
  | "bill_updated"
  | "service_request_created"
  | "service_request_updated";

export type OrderEventPayload = {
  restaurantId: string;
  type: OrderEventType;
  data?: any;
};

export function emitOrderEvent(payload: OrderEventPayload): Promise<void> {
  const delivery = broadcastOrderEvent(payload).catch((err) => {
    console.error("Failed to broadcast restaurant event", err);
  });
  // Do not hold guest checkout or service-request responses open for a realtime
  // provider. On Vercel, waitUntil keeps the bounded publish alive after the
  // response; in local Node, the caught promise continues in the background.
  if (process.env.VERCEL) {
    waitUntil(delivery);
    return Promise.resolve();
  }
  void delivery;
  return Promise.resolve();
}
