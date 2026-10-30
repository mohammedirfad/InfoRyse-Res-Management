const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function realtimeBaseUrl() {
  if (!/^https:\/\//i.test(SUPABASE_URL) || !SUPABASE_KEY) return null;
  const url = new URL(SUPABASE_URL);
  url.protocol = "wss:";
  url.pathname = "/realtime/v1/websocket";
  url.search = "";
  url.searchParams.set("apikey", SUPABASE_KEY);
  url.searchParams.set("vsn", "1.0.0");
  return url.toString();
}

export async function broadcastOrderEvent(payload: {
  restaurantId: string;
  type: string;
  data?: any;
}) {
  const base = SUPABASE_URL;
  if (!/^https:\/\//i.test(base) || !SUPABASE_KEY) return;

  const data = payload.data ?? {};
  const order = data.order ?? data;
  const tableId = data.tableId ?? order.tableId ?? order.table?.id;
  const publicData = payload.type === "order_created"
    ? {
        orderId: order.id ?? data.orderId,
        orderNumber: order.orderNumber ?? data.orderNumber,
        tableId,
        tableLabel: order.table?.label ?? data.tableLabel ?? null,
        customerName: order.customerName ?? data.customerName ?? null,
        status: order.status ?? "NEW",
        totalCents: order.totalCents ?? data.totalCents ?? 0,
        createdAt: order.createdAt ?? data.createdAt ?? new Date().toISOString(),
      }
    : payload.type === "service_request_created" || payload.type === "service_request_updated"
    ? {
        id: data.request?.id ?? data.id,
        tableId: data.request?.tableId ?? data.tableId,
        tableLabel: data.request?.tableLabel ?? data.tableLabel ?? null,
        requests: data.request?.requests ?? data.requests ?? [],
        status: data.request?.status ?? data.status,
        createdAt: data.request?.createdAt ?? data.createdAt ?? new Date().toISOString(),
      }
    : {
        orderNumber: data.orderNumber,
        status: data.status,
        tableId,
        sessionId: data.tableSessionId ?? data.sessionId,
        requested: data.requested,
        shareToken: payload.type === "bill_updated" ? data.shareToken : undefined,
      };

  const messages = [
    { topic: `restaurant:${payload.restaurantId}`, private: true, payload },
    ...(tableId ? [{
      topic: `table:${payload.restaurantId}:${tableId}`,
      private: true,
      payload: { restaurantId: payload.restaurantId, type: payload.type, data: publicData },
    }] : []),
  ];
  const results = await Promise.all(messages.map(async (message) => {
    const endpoint = `${base}/realtime/v1/api/broadcast/${encodeURIComponent(message.topic)}/events/restaurant_event?private=${message.private}`;
    return fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message.payload),
      // Keep an unavailable realtime service from holding up order submission.
      signal: AbortSignal.timeout(1500),
    });
  }));
  for (const result of results) {
    if (!result.ok) console.error(`[realtime:broadcast] Supabase returned ${result.status}`);
  }
}

export function createRealtimeEventStream(
  req: Request,
  topic: string,
  privateChannel: boolean,
  initialSnapshot?: unknown,
) {
  const url = realtimeBaseUrl();
  if (!url) {
    return Response.json({ error: "Realtime is not configured" }, { status: 503 });
  }
  if (typeof WebSocket === "undefined") {
    return Response.json({ error: "This runtime does not support realtime streams" }, { status: 503 });
  }

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  const write = (chunk: string) => {
    void writer.write(encoder.encode(chunk)).catch(() => {});
  };
  const sse = (event: string, data: unknown) =>
    write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  write("retry: 30000\n\n");

  let sequence = 0;
  let closed = false;
  let joined = false;
  let realtimeUnavailable = false;
  let joinRef = "";
  const channelTopic = `realtime:${topic}`;
  const socket = new WebSocket(url);
  const markRealtimeUnavailable = () => {
    if (joined || closed || realtimeUnavailable) return;
    realtimeUnavailable = true;
    clearTimeout(connectTimeout);
    sse("realtime_unavailable", { ok: false });
    try { if (socket.readyState < WebSocket.CLOSING) socket.close(1011, "realtime join timed out"); } catch { /* already closed */ }
  };
  const connectTimeout = setTimeout(markRealtimeUnavailable, 8000);
  const send = (event: string, payload: unknown, ref = String(++sequence)) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify([ref, ref, channelTopic, event, payload]));
  };

  const heartbeat = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      const ref = String(++sequence);
      socket.send(JSON.stringify([null, ref, "phoenix", "heartbeat", {}]));
    }
    write(": keep-alive\n\n");
  }, 25000);

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearTimeout(connectTimeout);
    clearInterval(heartbeat);
    req.signal.removeEventListener("abort", cleanup);
    try { if (socket.readyState < WebSocket.CLOSING) socket.close(1000, "client disconnected"); } catch { /* already closed */ }
    void writer.close().catch(() => {});
  };

  socket.addEventListener("open", () => {
    joinRef = String(++sequence);
    send("phx_join", {
      config: {
        broadcast: { ack: false, self: false },
        presence: { enabled: false },
        postgres_changes: [],
        private: privateChannel,
      },
      access_token: SUPABASE_KEY,
    }, joinRef);
  });

  socket.addEventListener("message", (message) => {
    try {
      const frame = JSON.parse(String(message.data));
      if (!Array.isArray(frame)) return;
      if (frame[3] === "phx_reply" && frame[1] === joinRef) {
        if (frame[4]?.status === "ok") {
          joined = true;
          clearTimeout(connectTimeout);
          if (initialSnapshot !== undefined) sse("snapshot", initialSnapshot);
          sse("connected", { ok: true });
        } else {
          markRealtimeUnavailable();
        }
        return;
      }
      if (!joined || frame[3] !== "broadcast") return;
      const broadcast = frame[4] ?? {};
      const payload = broadcast.payload ?? broadcast;
      sse("restaurant_event", payload);
    } catch { /* Ignore non-JSON protocol frames. */ }
  });
  socket.addEventListener("error", () => {
    if (joined) cleanup();
    else markRealtimeUnavailable();
  });
  socket.addEventListener("close", () => {
    if (joined) cleanup();
    else markRealtimeUnavailable();
  });
  req.signal.addEventListener("abort", cleanup, { once: true });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
