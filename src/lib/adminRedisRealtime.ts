import Redis from "ioredis";
import type { WebSocket } from "@vercel/functions";

const CHANNEL_PREFIX = "inforyse:admin-events:";
const REDIS_URL = process.env.REDIS_URL;

type SocketRecord = { restaurantId: string; socket: WebSocket };
type RealtimeGlobal = typeof globalThis & {
  __inforyseRedisPublisher?: Redis;
  __inforyseRedisSubscriber?: Redis;
  __inforyseRedisSubscribePromise?: Promise<void>;
  __inforyseAdminSockets?: Set<SocketRecord>;
};

const runtimeGlobal = globalThis as RealtimeGlobal;
const sockets = runtimeGlobal.__inforyseAdminSockets ??= new Set<SocketRecord>();

function publisher() {
  if (!REDIS_URL) return null;
  if (!runtimeGlobal.__inforyseRedisPublisher) {
    const client = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    connectTimeout: 2500,
    retryStrategy: (attempt) => Math.min(attempt * 200, 1500),
  });
    client.on("error", (error) => console.error("[admin-realtime:redis] publisher error", error.message));
    runtimeGlobal.__inforyseRedisPublisher = client;
  }
  return runtimeGlobal.__inforyseRedisPublisher;
}

async function subscribeToAdminEvents() {
  if (!REDIS_URL) throw new Error("REDIS_URL is not configured");
  if (!runtimeGlobal.__inforyseRedisSubscribePromise) {
    const subscriber = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      connectTimeout: 2500,
      retryStrategy: (attempt) => Math.min(attempt * 200, 1500),
    });
    subscriber.on("error", (error) => console.error("[admin-realtime:redis] subscriber error", error.message));
    runtimeGlobal.__inforyseRedisSubscriber = subscriber;
    runtimeGlobal.__inforyseRedisSubscribePromise = (async () => {
      subscriber.on("pmessage", (_pattern, channel, raw) => {
        const restaurantId = channel.slice(CHANNEL_PREFIX.length);
        if (!restaurantId) return;
        for (const record of sockets) {
          if (record.restaurantId !== restaurantId || record.socket.readyState !== 1) continue;
          try { record.socket.send(JSON.stringify({ type: "restaurant_event", event: JSON.parse(raw) })); }
          catch { /* A disconnected client will reconcile from the database on reconnect. */ }
        }
      });
      await subscriber.connect();
      await subscriber.psubscribe(`${CHANNEL_PREFIX}*`);
      console.info("[admin-realtime:redis] subscriber ready");
    })().catch((error) => {
      runtimeGlobal.__inforyseRedisSubscribePromise = undefined;
      runtimeGlobal.__inforyseRedisSubscriber = undefined;
      subscriber.disconnect();
      throw error;
    });
  }
  await runtimeGlobal.__inforyseRedisSubscribePromise;
}

export function isAdminRedisRealtimeConfigured() {
  // Use the same condition in the admin layout, publisher, and WS route.
  // Local `next dev` uses SSE; Production with REDIS_URL uses Redis WebSockets.
  return process.env.NODE_ENV === "production" && Boolean(REDIS_URL);
}

export async function publishAdminRestaurantEvent(event: {
  restaurantId: string;
  type: string;
  data?: unknown;
}) {
  const client = publisher();
  if (!client) return false;
  if (client.status === "wait") await client.connect();
  const subscriberCount = await client.publish(`${CHANNEL_PREFIX}${event.restaurantId}`, JSON.stringify(event));
  console.info("[admin-realtime:redis] event published", { type: event.type, subscriberCount });
  return true;
}

export async function attachAdminRealtimeSocket(socket: WebSocket, restaurantId: string) {
  if (!REDIS_URL) {
    socket.close(1013, "Realtime is not configured");
    return;
  }
  const record = { restaurantId, socket };
  sockets.add(record);
  let removed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const remove = () => {
    if (removed) return;
    removed = true;
    if (heartbeat) clearInterval(heartbeat);
    sockets.delete(record);
    if (sockets.size === 0) {
      const subscriber = runtimeGlobal.__inforyseRedisSubscriber;
      runtimeGlobal.__inforyseRedisSubscriber = undefined;
      runtimeGlobal.__inforyseRedisSubscribePromise = undefined;
      if (subscriber) void subscriber.punsubscribe(`${CHANNEL_PREFIX}*`).finally(() => subscriber.disconnect());
    }
  };
  // Register synchronously so a fast close during Redis setup cannot leak a
  // stale socket in this Vercel function instance.
  socket.once("close", remove);
  socket.once("error", remove);
  try {
    await subscribeToAdminEvents();
    if (socket.readyState !== 1 || removed) return;
    socket.send(JSON.stringify({ type: "connected" }));
  } catch (error) {
    console.error("[admin-realtime:redis] subscription failed", error);
    remove();
    if (socket.readyState === 1) socket.close(1013, "Realtime temporarily unavailable");
    return;
  }

  heartbeat = setInterval(() => {
    if (socket.readyState === 1) socket.ping();
  }, 25000);
}
