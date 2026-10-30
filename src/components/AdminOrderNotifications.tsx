"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Check, ReceiptText, Volume2, VolumeX, X } from "lucide-react";
import { formatRupees, formatTime } from "@/lib/utils";

type IncomingOrder = {
  id: string;
  orderNumber: number;
  customerName: string | null;
  totalCents: number;
  createdAt: string;
  table: { label: string } | null;
};

type ServiceRequest = {
  id: string;
  tableId: string;
  tableSessionId: string | null;
  tableLabel: string;
  requests: string[];
  custom: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: string;
};

const SERVICE_LABELS: Record<string, string> = {
  pay_bill: "Bill",
  wifi: "Wi-Fi password",
  water: "Water bottle",
  waiter: "Call waiter",
  cutlery: "Extra cutlery",
  lighter: "Lighter",
  sauce: "Sauce / condiments",
  ice: "Ice / cold water",
  tissues: "Tissues",
  packing: "Packing box",
  chair: "Extra chair",
  cake: "Cake cutting",
  candle: "Candle",
  birthday: "Birthday setup",
};

const STORAGE_KEY = "inforyse_admin_seen_orders_v1";

export default function AdminOrderNotifications() {
  const [orders, setOrders] = useState<IncomingOrder[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [serviceToast, setServiceToast] = useState<ServiceRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<IncomingOrder | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const cursor = useRef("");
  const soundEnabledRef = useRef(true);
  const seen = useRef(new Set<string>());
  const audio = useRef<AudioContext | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const chime = useCallback(async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      audio.current ??= new AudioContextClass();
      if (audio.current.state === "suspended") await audio.current.resume();
      const ctx = audio.current;
      [880, 1174].forEach((frequency, index) => {
        const start = ctx.currentTime + index * 0.13;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.4);
      });
    } catch { /* Browser may require a user gesture before audio playback. */ }
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      if (!soundEnabledRef.current) return;
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        audio.current ??= new AudioContextClass();
        if (audio.current.state === "suspended") void audio.current.resume().catch(() => {});
      } catch { /* Keep visual notifications available if audio is unsupported. */ }
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) seen.current = new Set(JSON.parse(saved));
      const savedSound = localStorage.getItem("inforyse_admin_order_sound");
      if (savedSound !== null) {
        soundEnabledRef.current = savedSound === "true";
        setSoundEnabled(soundEnabledRef.current);
      }
    } catch { /* Ignore unavailable browser storage. */ }
    cursor.current = new Date(Date.now() - 60000).toISOString();
    let disposed = false;
    let connectedBefore = false;
    let streamConnected = false;
    let snapshotBusy = false;
    let authorized = true;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let source: EventSource | null = null;
    const remember = (order: IncomingOrder) => {
      if (!order?.id || seen.current.has(order.id)) return;
      seen.current.add(order.id);
      const trimmed = [...seen.current].slice(-200);
      seen.current = new Set(trimmed);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* ignore */ }
      setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)].slice(0, 25));
      if (soundEnabledRef.current) chime();
      if (pathnameRef.current !== "/admin/orders") {
        setToast(order);
        window.setTimeout(() => setToast((current) => current?.id === order.id ? null : current), 6500);
      }
      window.dispatchEvent(new CustomEvent("inforyse:new-orders", { detail: [order] }));
    };
    const loadSnapshot = async (emitResync = false) => {
      if (disposed || snapshotBusy || document.visibilityState === "hidden") return;
      snapshotBusy = true;
      const since = cursor.current;
      try {
        const response = await fetch(`/api/admin/notifications?since=${encodeURIComponent(since)}`, { cache: "no-store" });
        if (response.status === 401) {
          authorized = false;
          source?.close();
          if (fallbackTimer) clearInterval(fallbackTimer);
          fallbackTimer = null;
          router.replace("/admin/login");
          return;
        }
        if (!response.ok || disposed) return;
        const data = await response.json();
        for (const order of data.orders ?? []) remember(order);
        setServiceRequests(data.serviceRequests ?? []);
        cursor.current = new Date(Date.now() - 2000).toISOString();
        if (emitResync) window.dispatchEvent(new CustomEvent("inforyse:restaurant-event", { detail: { type: "resync" } }));
      } catch { /* The realtime stream remains active; retry on reconnect/focus. */ }
      finally { snapshotBusy = false; }
    };
    source = new EventSource("/api/admin/events");
    source.addEventListener("connected", () => {
      streamConnected = true;
      if (fallbackTimer) clearInterval(fallbackTimer);
      fallbackTimer = null;
      if (connectedBefore && document.visibilityState === "visible") void loadSnapshot(true);
      connectedBefore = true;
    });
    source.addEventListener("restaurant_event", (rawEvent) => {
      try {
        const event = JSON.parse((rawEvent as MessageEvent).data);
        window.dispatchEvent(new CustomEvent("inforyse:restaurant-event", { detail: event }));
        if (event.type === "service_request_created" || event.type === "service_request_updated") {
          const request = event.data?.request as ServiceRequest | undefined;
          if (!request?.id) return;
          setServiceRequests((current) => {
            const remaining = current.filter((item) => item.id !== request.id);
            return request.status === "PENDING" || request.status === "IN_PROGRESS"
              ? [request, ...remaining].slice(0, 50)
              : remaining;
          });
          if (event.type === "service_request_created") {
            setServiceToast(request);
            window.setTimeout(() => setServiceToast((current) => current?.id === request.id ? null : current), 8000);
            if (soundEnabledRef.current) chime();
          }
          return;
        }
        if (event.type !== "order_created") return;
        const data = event.data ?? {};
        const order = data.order ?? data;
        const orderNumber = order.orderNumber ?? data.orderNumber;
        remember({
          id: order.id ?? data.orderId ?? `${event.restaurantId}-${orderNumber}`,
          orderNumber,
          customerName: order.customerName ?? data.customerName ?? null,
          totalCents: order.totalCents ?? data.totalCents ?? 0,
          createdAt: order.createdAt ?? data.createdAt ?? new Date().toISOString(),
          table: order.table ?? (data.tableLabel ? { label: data.tableLabel } : null),
        });
      } catch { /* Ignore malformed realtime events. */ }
    });
    const startFallback = () => {
      if (!authorized) return;
      streamConnected = false;
      if (!fallbackTimer) {
        void loadSnapshot(true);
        fallbackTimer = setInterval(() => {
          if (!streamConnected && document.visibilityState === "visible") void loadSnapshot(true);
        }, 8000);
      }
    };
    source.addEventListener("realtime_unavailable", startFallback);
    source.onerror = startFallback;
    void loadSnapshot();
    const onVisible = () => { if (document.visibilityState === "visible") void loadSnapshot(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      source?.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
      document.removeEventListener("visibilitychange", onVisible);
      if (audio.current) void audio.current.close();
    };
  }, [chime, router]);

  function toggleSound() {
    const next = !soundEnabled;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    try { localStorage.setItem("inforyse_admin_order_sound", String(next)); } catch { /* ignore */ }
    if (next) chime();
  }

  async function updateServiceRequest(requestId: string, status: "IN_PROGRESS" | "COMPLETED") {
    try {
      const response = await fetch(`/api/admin/service-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Could not update request");
      setServiceRequests((current) => status === "COMPLETED" ? current.filter((item) => item.id !== requestId) : current.map((item) => item.id === requestId ? { ...item, status } : item));
    } catch (error) {
      console.error("Could not update service request", error);
    }
  }

  return (
    <div className="fixed right-4 top-3 z-[90] md:right-6 md:top-4">
      <button
        type="button"
        onClick={() => {
          if (soundEnabledRef.current) {
            try {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContextClass) {
                audio.current ??= new AudioContextClass();
                if (audio.current.state === "suspended") void audio.current.resume().catch(() => {});
              }
            } catch { /* Keep visual notifications available if audio is unsupported. */ }
          }
          setOpen((value) => !value);
        }}
        aria-label={`Notifications${orders.length + serviceRequests.length ? `, ${orders.length + serviceRequests.length} active` : ""}`}
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:text-emerald-800"
      >
        <Bell className="h-5 w-5" />
        {orders.length + serviceRequests.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold text-white">{orders.length + serviceRequests.length > 9 ? "9+" : orders.length + serviceRequests.length}</span>}
      </button>

      {serviceToast && (
        <div role="status" className="fixed left-1/2 top-16 z-[95] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[min(22rem,calc(100vw-2rem))] sm:translate-x-0">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><ReceiptText className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">{serviceToast.requests.includes("pay_bill") ? "Bill requested" : "Service requested"} · Table {serviceToast.tableLabel}</p>
              <p className="mt-1 text-xs text-slate-500">{serviceToast.requests.map((request) => SERVICE_LABELS[request] ?? request).join(", ")}{serviceToast.custom ? ` · ${serviceToast.custom}` : ""}</p>
              {serviceToast.requests.includes("pay_bill")
                ? <Link href={`/admin/bill?tableId=${encodeURIComponent(serviceToast.tableId)}`} onClick={() => setServiceToast(null)} className="mt-2 inline-flex text-xs font-bold text-emerald-800">Open this table’s bill</Link>
                : <button type="button" onClick={() => { setOpen(true); setServiceToast(null); }} className="mt-2 text-xs font-bold text-emerald-800">Review request</button>}
            </div>
            <button aria-label="Dismiss service request alert" onClick={() => setServiceToast(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed left-1/2 top-16 z-[95] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 animate-toast-enter overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:z-auto sm:w-[min(22rem,calc(100vw-2rem))] sm:translate-x-0">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Bell className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">New order #{toast.orderNumber}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{toast.table?.label ?? "Takeaway"} · {toast.customerName || "Guest"} · {formatRupees(toast.totalCents)}</p>
              <Link href="/admin/orders" onClick={() => setToast(null)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-800">Open order <span aria-hidden>→</span></Link>
            </div>
            <button aria-label="Dismiss notification" onClick={() => setToast(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {open && (
        <div className="absolute right-0 top-14 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div><p className="text-sm font-bold text-slate-900">Restaurant notifications</p><p className="text-[11px] text-slate-500">Orders and guest service requests</p></div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={toggleSound} aria-label={soundEnabled ? "Mute order alerts" : "Enable order sound"} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
              <button type="button" onClick={() => setOrders([])} aria-label="Clear order alerts" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Check className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="max-h-[min(75vh,34rem)] overflow-y-auto">
            {serviceRequests.length > 0 && <div className="border-b border-slate-100 bg-amber-50/60 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-800">Guest service requests</div>}
            {serviceRequests.map((request) => (
              <div key={request.id} className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Table {request.tableLabel}{request.requests.includes("pay_bill") ? " · Bill" : ""}</p>
                    <p className="mt-1 text-xs text-slate-600">{request.requests.map((item) => SERVICE_LABELS[item] ?? item).join(", ")}</p>
                    {request.custom && <p className="mt-1 text-xs text-slate-500">{request.custom}</p>}
                    <p className="mt-1 text-[10px] text-slate-400">{formatTime(request.createdAt)}</p>
                  </div>
                  {request.requests.includes("pay_bill") && <Link href={`/admin/bill?tableId=${encodeURIComponent(request.tableId)}`} onClick={() => setOpen(false)} className="shrink-0 text-xs font-bold text-emerald-800">Open bill</Link>}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {request.status === "PENDING" && <button type="button" onClick={() => void updateServiceRequest(request.id, "IN_PROGRESS")} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Start</button>}
                  <button type="button" onClick={() => void updateServiceRequest(request.id, "COMPLETED")} className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white">Mark done</button>
                  {request.status === "IN_PROGRESS" && <span className="text-[10px] font-semibold text-amber-700">In progress</span>}
                </div>
              </div>
            ))}
            {orders.length ? orders.map((order) => (
              <Link key={order.id} href="/admin/orders" onClick={() => { setOpen(false); setOrders((current) => current.filter((item) => item.id !== order.id)); }} className="block border-b border-slate-50 px-4 py-3 transition hover:bg-emerald-50/60">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">Order #{order.orderNumber}</p><span className="text-xs font-bold text-emerald-800">{formatRupees(order.totalCents)}</span></div>
                <p className="mt-1 text-xs text-slate-500">{order.table?.label ?? "Takeaway"} · {order.customerName || "Guest"}</p>
              </Link>
            )) : serviceRequests.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">You’re all caught up.</p> : null}
          </div>
          {orders.length > 0 && <Link href="/admin/orders" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-xs font-bold text-emerald-800 hover:bg-emerald-50">Go to orders</Link>}
        </div>
      )}
    </div>
  );
}
