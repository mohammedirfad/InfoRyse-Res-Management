"use client";

type RealtimeScope = { scope: "restaurant" } | { scope: "table"; slug: string; qrToken: string };
type RealtimeEvent = { type: string; data?: Record<string, any>; restaurantId?: string };
type TokenResponse = { url: string; anonKey: string; token: string; topic: string };

/** Connect straight from the browser to Supabase Realtime using a five-minute,
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
  let attempt = 0;
  let ref = 0;
  let joinRef = "";
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
        joinRef = String(++ref);
        socket.send(JSON.stringify([joinRef, joinRef, `realtime:${config.topic}`, "phx_join", {
          config: { broadcast: { ack: false, self: false }, presence: { enabled: false }, postgres_changes: [], private: true },
          access_token: config.token,
        }]));
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
            } else socket?.close(4403, "realtime access denied");
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
        if (rotateTimer !== null) window.clearTimeout(rotateTimer);
        rotateTimer = null;
        if (isConnected) onConnection?.(false);
        isConnected = false;
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
    if (document.visibilityState !== "visible" || stopped || socket) return;
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
    void connect();
  };
  document.addEventListener("visibilitychange", onVisibility);
  void connect();
  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisibility);
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    if (rotateTimer !== null) window.clearTimeout(rotateTimer);
    socket?.close(1000, "subscription closed");
    socket = null;
  };
}

