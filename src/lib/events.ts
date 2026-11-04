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
  // Keep notification delivery out of the order/status response path on Vercel.
  // Local development awaits delivery so same-process behavior stays predictable.
  if (process.env.VERCEL) {
    waitUntil(delivery);
    return Promise.resolve();
  }
  return delivery;
}
