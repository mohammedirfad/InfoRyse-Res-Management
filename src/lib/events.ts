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
  // New orders and guest service requests must be published before their API
  // response succeeds; otherwise a serverless instance can finish the request
  // before the live notification has actually left the function. Keep routine
  // status updates off the response path.
  const mustDeliverBeforeResponse =
    payload.type === "order_created" || payload.type === "service_request_created";
  if (process.env.VERCEL && !mustDeliverBeforeResponse) {
    waitUntil(delivery);
    return Promise.resolve();
  }
  return delivery;
}
