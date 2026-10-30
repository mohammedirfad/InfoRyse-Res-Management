import { broadcastOrderEvent } from "@/lib/supabaseRealtime";

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

export function emitOrderEvent(payload: OrderEventPayload): void {
  void broadcastOrderEvent(payload).catch((err) => {
    console.error("Failed to broadcast restaurant event", err);
  });
}
