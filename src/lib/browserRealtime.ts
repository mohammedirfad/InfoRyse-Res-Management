"use client";

type RealtimeScope = { scope: "restaurant" } | { scope: "table"; slug: string; qrToken: string };
type RealtimeEvent = { type: string; data?: Record<string, any>; restaurantId?: string };
type TokenResponse = { url: string; anonKey: string; token: string; topic: string };

/** Connect straight from the browser to Supabase Realtime using a short-lived,
 * server-minted JWT scoped by RLS to one restaurant or QR table. */
export async function subscribeBrowserRealtime(
  scope: RealtimeScope,
  onEvent: (event: RealtimeEvent) => void,
  onConnection?: (connected: boolean) => void,
  onRejected?: () => void,
): Promise<(() => void) | null> {
  let stopped = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let rotateTimer: number | null = null;
  let heartbeatTimer: number | null = null;
  let attempt = 0;
  let ref = 0;
  let joinRef = "";
  let pendingHeartbeatRef: string | null = null;
  let lastHeartbeatAckAt = 0;
  let isConnected = false;
  let initialConfig: TokenResponse | null = null;

  try {
    const response = await fetch("/api/realtime-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scope),
      cache: "no-store",
    });
    if (!response.ok) return null;
    initialConfig = await response.json() as TokenResponse;
  } catch {
    return null;
  }

  const connect = async () => {
    if (stopped || document.visibilityState === "hidden") return;
    try {
      let config = initialConfig;
      if (config) initialConfig = null;
      else {
        const response = await fetch("/api/realtime-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scope),
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Realtime credentials unavailable");
        config = await response.json() as TokenResponse;
      }
      if (stopped) return;
      const endpoint = new URL("/realtime/v1/websocket", config.url);
      endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
      endpoint.searchParams.set("apikey", config.anonKey);
      endpoint.searchParams.set("vsn", "1.0.0");
      socket = new WebSocket(endpoint);
      socket.onopen = () => {
        if (!socket || stopped) return;
        lastHeartbeatAckAt = Date.now();
        joinRef = String(++ref);
        socket.send(JSON.stringify([joinRef, joinRef, `realtime:${config.topic}`, "phx_join", {
          config: { broadcast: { ack: false, self: false }, presence: { enabled: false }, postgres_changes: [], private: true },
          access_token: config.token,
        }]));
        // Phoenix closes idle Realtime sockets unless the client sends a
        // heartbeat. Keep the direct browser connection alive and detect
        // mobile/network drops promptly instead of waiting for a refresh.
        heartbeatTimer = window.setInterval(() => {
          const activeSocket = socket;
          if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) return;
          if (pendingHeartbeatRef && Date.now() - lastHeartbeatAckAt > 45_000) {
            activeSocket.close(4000, "realtime heartbeat timed out");
            return;
          }
          const heartbeatRef = String(++ref);
          pendingHeartbeatRef = heartbeatRef;
          try {
            activeSocket.send(JSON.stringify([null, heartbeatRef, "phoenix", "heartbeat", {}]));
          } catch {
            activeSocket.close();
          }
        }, 20_000);
      };
      socket.onmessage = (message) => {
        try {
          const frame = JSON.parse(String(message.data));
          if (!Array.isArray(frame)) return;
          if (frame[3] === "phx_reply" && frame[1] === joinRef) {
            if (frame[4]?.status === "ok") {
              attempt = 0;
              isConnected = true;
              onConnection?.(true);
              rotateTimer = window.setTimeout(() => socket?.close(4001, "refresh scoped realtime token"), 14 * 60_000);
            } else {
              console.warn("[realtime] private channel join rejected", frame[4]?.response ?? frame[4]?.status ?? "unknown");
              socket?.close(4403, "realtime access denied");
            }
            return;
          }
          if (frame[3] === "phx_reply" && frame[1] === pendingHeartbeatRef) {
            if (frame[4]?.status === "ok") {
              pendingHeartbeatRef = null;
              lastHeartbeatAckAt = Date.now();
            }
            return;
          }
          if (frame[3] === "phx_error" || frame[3] === "phx_close") {
            socket?.close(4000, "realtime channel closed");
            return;
          }
          if (isConnected && frame[3] === "broadcast") {
            const broadcast = frame[4] ?? {};
            onEvent(broadcast.payload ?? broadcast);
          }
        } catch { /* Ignore malformed protocol frames. */ }
      };
      socket.onclose = (event) => {
        socket = null;
        if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        if (rotateTimer !== null) window.clearTimeout(rotateTimer);
        rotateTimer = null;
        if (isConnected) onConnection?.(false);
        isConnected = false;
        pendingHeartbeatRef = null;
        if (event.code === 4403) {
          stopped = true;
          onRejected?.();
          return;
        }
        scheduleReconnect();
      };
      socket.onerror = () => socket?.close();
    } catch {
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer !== null) return;
    const base = Math.min(30_000, 1000 * 2 ** attempt++);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, base + Math.floor(Math.random() * 250));
  };
  const onVisibility = () => {
    if (document.visibilityState !== "visible" || stopped) return;
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
    if (socket && socket.readyState === WebSocket.OPEN && isConnected) return;
    socket?.close(4000, "reconnect after tab became visible");
    if (socket) return; // onclose schedules a fresh connection
    void connect();
  };
  document.addEventListener("visibilitychange", onVisibility);
  void connect();
  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisibility);
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
    if (rotateTimer !== null) window.clearTimeout(rotateTimer);
    socket?.close(1000, "subscription closed");
    socket = null;
  };
}

