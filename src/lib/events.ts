import { EventEmitter } from "events";

export type OrderEventType = "order_created" | "order_updated" | "bill_updated";

export type OrderEventPayload = {
  restaurantId: string;
  type: OrderEventType;
  data?: any;
};

// Global singleton event emitter across dev reloads
declare global {
  // eslint-disable-next-line no-var
  var __restaurantEventEmitter: EventEmitter | undefined;
}

export const orderEvents: EventEmitter =
  global.__restaurantEventEmitter ?? new EventEmitter();

orderEvents.setMaxListeners(100);

if (process.env.NODE_ENV !== "production") {
  global.__restaurantEventEmitter = orderEvents;
}

export function emitOrderEvent(payload: OrderEventPayload) {
  try {
    orderEvents.emit("restaurant_event", payload);
  } catch (err) {
    console.error("Failed to emit order event", err);
  }
}
