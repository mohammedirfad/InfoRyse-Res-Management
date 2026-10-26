"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Check, Volume2, VolumeX, X } from "lucide-react";
import { formatRupees } from "@/lib/utils";

type IncomingOrder = {
  id: string;
  orderNumber: number;
  customerName: string | null;
  totalCents: number;
  createdAt: string;
  table: { label: string } | null;
};

const STORAGE_KEY = "inforyse_admin_seen_orders_v1";

export default function AdminOrderNotifications() {
  const [orders, setOrders] = useState<IncomingOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<IncomingOrder | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const cursor = useRef("");
  const soundEnabledRef = useRef(true);
  const seen = useRef(new Set<string>());
  const audio = useRef<AudioContext | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const chime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      audio.current ??= new AudioContextClass();
      if (audio.current.state === "suspended") void audio.current.resume().catch(() => {});
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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) seen.current = new Set(JSON.parse(saved));
      const savedSound = localStorage.getItem("inforyse_admin_order_sound");
      if (savedSound !== null) {
        soundEnabledRef.current = savedSound === "true";
        setSoundEnabled(soundEnabledRef.current);
      }
    } catch { /* Ignore unavailable browser storage. */ }
    cursor.current = new Date(Date.now() - 2000).toISOString();

    let disposed = false;
    let busy = false;
    const poll = async () => {
      if (disposed || busy || document.visibilityState === "hidden") return;
      busy = true;
      const requestedSince = cursor.current;
      try {
        const response = await fetch(`/api/admin/notifications?since=${encodeURIComponent(requestedSince)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        const fresh = (data.orders ?? []).filter((order: IncomingOrder) => !seen.current.has(order.id));
        // Keep a small overlap so a transaction that commits just after a
        // poll's database snapshot is still found on the next poll. IDs dedupe it.
        cursor.current = new Date(new Date(requestedSince).getTime() - 1000).toISOString();
        if (!fresh.length) return;

        fresh.forEach((order: IncomingOrder) => seen.current.add(order.id));
        const trimmed = [...seen.current].slice(-200);
        seen.current = new Set(trimmed);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* ignore */ }
        setOrders((current) => [...fresh, ...current].slice(0, 25));
        const latest = fresh[fresh.length - 1];
        if (pathnameRef.current !== "/admin/orders") {
          setToast(latest);
          window.setTimeout(() => setToast((current) => current?.id === latest.id ? null : current), 6500);
          if (soundEnabledRef.current) chime();
        }
        window.dispatchEvent(new CustomEvent("inforyse:new-orders", { detail: fresh }));
      } catch { /* Retry automatically on the next poll. */ }
      finally { busy = false; }
    };

    void poll();
    const interval = window.setInterval(poll, 8000);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      if (audio.current) void audio.current.close();
    };
  }, [chime]);

  function toggleSound() {
    const next = !soundEnabled;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    try { localStorage.setItem("inforyse_admin_order_sound", String(next)); } catch { /* ignore */ }
    if (next) chime();
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
        aria-label={`Order notifications${orders.length ? `, ${orders.length} unread` : ""}`}
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:text-emerald-800"
      >
        <Bell className="h-5 w-5" />
        {orders.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold text-white">{orders.length > 9 ? "9+" : orders.length}</span>}
      </button>

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
            <div><p className="text-sm font-bold text-slate-900">Order notifications</p><p className="text-[11px] text-slate-500">Updates checked every few seconds</p></div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={toggleSound} aria-label={soundEnabled ? "Mute order alerts" : "Enable order sound"} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
              <button type="button" onClick={() => setOrders([])} aria-label="Clear notifications" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Check className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {orders.length ? orders.map((order) => (
              <Link key={order.id} href="/admin/orders" onClick={() => { setOpen(false); setOrders((current) => current.filter((item) => item.id !== order.id)); }} className="block border-b border-slate-50 px-4 py-3 transition hover:bg-emerald-50/60">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">Order #{order.orderNumber}</p><span className="text-xs font-bold text-emerald-800">{formatRupees(order.totalCents)}</span></div>
                <p className="mt-1 text-xs text-slate-500">{order.table?.label ?? "Takeaway"} · {order.customerName || "Guest"}</p>
              </Link>
            )) : <p className="px-4 py-8 text-center text-sm text-slate-500">You’re all caught up.</p>}
          </div>
          <Link href="/admin/orders" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-xs font-bold text-emerald-800 hover:bg-emerald-50">Go to orders</Link>
        </div>
      )}
    </div>
  );
}
