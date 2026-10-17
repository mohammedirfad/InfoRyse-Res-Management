"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UtensilsCrossed, RefreshCw, X, AlertTriangle } from "lucide-react";
import { getStoredOrders, saveStoredOrders } from "@/components/CartContext";

const STEPS: { label: string; subLabel: string; key: string }[] = [
  { label: "Order Placed",         subLabel: "We received your order",       key: "NEW"       },
  { label: "Accepted by Kitchen",  subLabel: "Kitchen confirmed your order", key: "ACCEPTED"  },
  { label: "Being Prepared",       subLabel: "Chef is cooking your food",    key: "PREPARING" },
  { label: "Ready to Serve",       subLabel: "Your food is ready! 🎉",       key: "READY"     },
  { label: "Enjoy Your Meal",      subLabel: "Served at your table",         key: "COMPLETED" },
];

const STATUS_ORDER = ["NEW", "ACCEPTED", "PREPARING", "READY", "COMPLETED"];
const CANCELLABLE  = ["NEW", "ACCEPTED"];

async function fetchStatus(slug: string, orderNumber: string) {
  try {
    const res = await fetch(
      `/api/public/order-status?slug=${encodeURIComponent(slug)}&orderNumber=${encodeURIComponent(orderNumber)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return (await res.json()).status as string ?? null;
  } catch { return null; }
}

export default function ConfirmationPage({ params }: { params: { slug: string; qrToken: string } }) {
  const sp          = useSearchParams();
  const orderNumber = sp.get("orderNumber") ?? "";
  const name        = sp.get("name") ?? "";
  const total       = Number(sp.get("total") ?? "0");
  const restaurantName = sp.get("restaurantName") ?? "";
  const placedAt    = useRef(new Date());

  const [status, setStatus]           = useState("NEW");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isPolling, setIsPolling]     = useState(false);
  const [showNudge, setShowNudge]     = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling]   = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelled, setCancelled]     = useState(false);

  const nudgeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDone      = status === "COMPLETED" || status === "CANCELLED";
  const canCancel   = CANCELLABLE.includes(status) && !cancelled;
  const currentIdx  = STATUS_ORDER.indexOf(status);

  // Real-time EventSource stream + gentle 30s heartbeat fallback
  useEffect(() => {
    if (!orderNumber) return;
    let stopped = false;
    let es: EventSource | null = null;

    // 1. Initial quick status check
    fetchStatus(params.slug, orderNumber).then((s) => {
      if (s && !stopped) {
        setStatus(s);
        setLastUpdated(new Date());
        if (s === "CANCELLED") setCancelled(true);
      }
    });

    // 2. Real-time EventSource connection (Zero delay, zero polling spam!)
    try {
      es = new EventSource(
        `/api/public/order-events?slug=${encodeURIComponent(params.slug)}&orderNumber=${encodeURIComponent(orderNumber)}`
      );

      es.addEventListener("order_status", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.status && !stopped) {
            setStatus(payload.status);
            setLastUpdated(new Date());
            if (payload.status === "CANCELLED") setCancelled(true);
            if (payload.status === "COMPLETED" || payload.status === "CANCELLED") {
              es?.close();
            }
          }
        } catch { /* ignore parse error */ }
      });

      es.onerror = () => {
        // EventSource will auto-reconnect if temporary network drop
      };
    } catch { /* ignore */ }

    // Show "order more" nudge after 30s idle
    nudgeTimer.current = setTimeout(() => setShowNudge(true), 30000);

    return () => {
      stopped = true;
      if (es) es.close();
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  // Build readable order ID: e.g. #RIV0010
  const prefix = (restaurantName || params.slug || "ORD")
    .replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3).padEnd(3, "X");
  const orderId = `#${prefix}${String(orderNumber).padStart(4, "0")}`;

  async function cancelOrder() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/public/orders/${orderNumber}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: params.slug, qrToken: params.qrToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error ?? "Could not cancel order");
        setCancelling(false);
        return;
      }
      // Update past orders in localStorage
      try {
        const existing = getStoredOrders(params.qrToken);
        const updated = existing.map((o) =>
          String(o.orderNumber) === String(orderNumber) ? { ...o, status: "CANCELLED" } : o
        );
        saveStoredOrders(params.qrToken, updated);
      } catch { /* ignore */ }
      setStatus("CANCELLED");
      setCancelled(true);
      setShowCancelConfirm(false);
    } catch {
      setCancelError("Network error — try again");
    }
    setCancelling(false);
  }

  function fmt(d: Date) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1] pb-12">

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#0D1F15] to-[#132A1E] text-white px-5 pt-10 pb-8 rounded-b-3xl shadow-md overflow-hidden">
        <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-[#D4A94C]/10 blur-xl pointer-events-none" />
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-emerald-400/20 scale-150 animate-pulse pointer-events-none" />
            <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl animate-pop">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display mb-1 text-white">
            Thank You{name ? `, ${name.split(" ")[0]}` : ""}! 🎉
          </h1>
          <p className="text-emerald-100/70 text-xs sm:text-sm max-w-xs leading-relaxed">
            Your order has been sent to the kitchen!
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">

        {/* Order details */}
        {orderNumber && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-xs overflow-hidden">
            <div className="bg-[#132A1E]/5 px-5 py-4 flex items-center justify-between border-b border-black/5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Order ID</p>
                <p className="text-xl sm:text-2xl font-extrabold text-[#132A1E] font-mono tracking-tight mt-0.5">{orderId}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total</p>
                <p className="text-xl font-extrabold text-gray-900 mt-0.5">₹{(total / 100).toFixed(0)}</p>
              </div>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400">Date</p>
                <p className="font-semibold text-gray-800 mt-0.5">{placedAt.current.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Time</p>
                <p className="font-semibold text-gray-800 mt-0.5">{fmt(placedAt.current)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Type</p>
                <p className="font-semibold text-gray-800 mt-0.5">Dine In</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Payment</p>
                <p className="font-semibold text-gray-800 mt-0.5">Pay at Counter</p>
              </div>
            </div>
          </div>
        )}

        {/* Live status tracker */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Order Status</h2>
            <div className={`flex items-center gap-1.5 text-xs ${isDone ? "text-green-600" : "text-gray-400"}`}>
              {isDone
                ? <span className="font-semibold">{cancelled ? "Cancelled" : "Completed ✓"}</span>
                : <><RefreshCw className={`h-3 w-3 ${isPolling ? "animate-spin" : ""}`} />
                   <span>Live · {fmt(lastUpdated)}</span></>
              }
            </div>
          </div>

          {status === "CANCELLED" ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
              <div className="text-4xl mb-3">❌</div>
              <p className="font-bold text-red-700 text-lg">Order Cancelled</p>
              <p className="text-red-500 text-sm mt-1">This order has been cancelled.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[17px] top-5 bottom-5 w-0.5 bg-gray-100" />
              <div className="absolute left-[17px] top-5 w-0.5 bg-[#132A1E] transition-all duration-700"
                style={{ height: currentIdx > 0 ? `${(currentIdx / (STEPS.length-1))*100}%` : "0%" }}/>
              <div className="space-y-5">
                {STEPS.map((step, i) => {
                  const done   = i < currentIdx;
                  const active = i === currentIdx;
                  return (
                    <div key={step.key} className="flex items-start gap-4 relative">
                      <div className={`relative z-10 h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500
                        ${done   ? "bg-[#132A1E] text-white shadow-sm"
                         : active ? "bg-[#132A1E] text-white shadow-md ring-4 ring-[#132A1E]/15"
                         : "bg-gray-100 text-gray-400"}`}>
                        {done
                          ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                          : <span className="text-xs font-bold">{i+1}</span>}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`text-sm font-bold leading-snug ${done||active?"text-gray-900":"text-gray-400"}`}>{step.label}</p>
                        <p className={`text-xs mt-0.5 ${active?"text-[#132A1E] font-semibold":done?"text-green-600":"text-gray-300"}`}>
                          {active
                            ? step.key==="NEW" ? `${fmt(placedAt.current)} · Just now` : `Updated ${fmt(lastUpdated)}`
                            : done ? "✓ " + step.subLabel
                            : step.subLabel}
                        </p>
                      </div>
                      {active && !isDone && <div className="pt-2 flex-shrink-0"><div className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse"/></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={`mt-5 rounded-xl px-4 py-3 text-xs font-medium leading-relaxed
            ${status==="READY"?"bg-green-50 border border-green-200 text-green-800"
             :status==="COMPLETED"?"bg-[#132A1E]/5 border border-[#132A1E]/10 text-[#132A1E]"
             :status==="CANCELLED"?"bg-red-50 border border-red-200 text-red-700"
             :"bg-amber-50 border border-amber-100 text-amber-700"}`}>
            {status==="READY"      && "🎉 Your food is ready! Waiter will serve it shortly."}
            {status==="COMPLETED"  && "✅ Enjoy your meal! Thank you for dining with us."}
            {status==="CANCELLED"  && "❌ Order cancelled. Please speak to our staff if you need help."}
            {(status==="NEW"||status==="ACCEPTED") && "⏳ Kitchen received your order and will confirm shortly."}
            {status==="PREPARING"  && "🍳 Chef is cooking your food with fresh ingredients!"}
          </div>
        </div>

        {/* Cancel order — only when NEW or ACCEPTED */}
        {canCancel && (
          <button onClick={() => setShowCancelConfirm(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-red-200 text-red-500 py-3.5 text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all">
            <X className="h-4 w-4" /> Cancel Order
          </button>
        )}

        {/* Cancel confirmation dialog */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowCancelConfirm(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"/>
            <div className="relative w-full bg-white rounded-t-3xl p-6 pb-8 shadow-2xl animate-slide-up"
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-500"/>
                </div>
              </div>
              <h3 className="text-center font-bold text-gray-900 text-lg mb-1">Cancel Order?</h3>
              <p className="text-center text-gray-500 text-sm mb-5">
                This will cancel order {orderId}. This cannot be undone.
              </p>
              {cancelError && <p className="text-center text-red-500 text-sm mb-3">{cancelError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowCancelConfirm(false)}
                  className="btn-primary border-2 border-gray-200 text-gray-700 justify-center py-3.5 rounded-2xl font-semibold">
                  Keep Order
                </button>
                <button onClick={cancelOrder} disabled={cancelling}
                  className="btn-primary bg-red-500 text-white justify-center py-3.5 rounded-2xl font-semibold disabled:opacity-60">
                  {cancelling
                    ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"/> Cancelling…</>
                    : "Yes, Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* "Order more" nudge — appears after 30s */}
        {showNudge && !isDone && (
          <div className="bg-[#132A1E]/5 border border-[#132A1E]/10 rounded-2xl p-4 flex items-center gap-3 animate-slide-up">
            <span className="text-2xl">🍽️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Want to order more?</p>
              <p className="text-xs text-gray-500">Browse the menu while you wait!</p>
            </div>
            <Link href={`/r/${params.slug}/${params.qrToken}`}
              className="flex-shrink-0 bg-[#132A1E] text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform">
              Menu →
            </Link>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/r/${params.slug}/${params.qrToken}`}
            className="btn-primary border-2 border-[#132A1E] text-[#132A1E] justify-center py-3.5 rounded-2xl font-semibold">
            <UtensilsCrossed className="h-4 w-4"/> Back to Menu
          </Link>
          <Link href={`/r/${params.slug}/${params.qrToken}/cart`}
            className="btn-primary bg-[#132A1E] text-white justify-center py-3.5 rounded-2xl font-semibold">
            View Orders →
          </Link>
        </div>

        <p className="text-center text-xs text-gray-300 mt-4 italic">— Good Food · Brighter Moments —</p>
      </div>
    </div>
  );
}
