"use client";

import { Bell, Check, X } from "lucide-react";
import { formatRupees } from "@/lib/utils";
import type { OrderRowData } from "@/components/AdminOrderRow";

export default function OrderArrivalToast({ order, onDismiss, onInspect, onAccept }: {
  order: OrderRowData;
  onDismiss: () => void;
  onInspect: (order: OrderRowData) => void;
  onAccept: (order: OrderRowData) => void;
}) {
  return <div className="fixed inset-x-0 top-4 z-[100] mx-auto w-[calc(100vw-1rem)] max-w-lg px-2 animate-toast-enter sm:top-5 sm:px-4">
    <div className="bg-slate-950/95 backdrop-blur-xl text-white rounded-3xl p-4 shadow-2xl border border-white/20 relative overflow-hidden flex flex-col gap-3">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 order-toast-progress" />
      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center flex-shrink-0 relative"><Bell className="h-5 w-5 animate-bounce" /><span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 animate-ping" /></div>
        <div><div className="flex items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">New Order Incoming</span><span className="font-bold text-white text-sm">#{order.orderNumber}</span></div>
          <p className="text-xs text-slate-300 font-medium mt-0.5">{order.table ? <span className="text-amber-300 font-bold">Table {order.table.label}</span> : "Takeaway"}{order.customerName ? ` · ${order.customerName}` : ""} · <span className="text-white font-bold">{formatRupees(order.totalCents)}</span></p>
        </div>
      </div><button onClick={onDismiss} aria-label="Dismiss new order alert" className="text-slate-400 hover:text-white p-1 rounded-lg"><X className="h-4 w-4" /></button></div>
      <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 truncate">{order.items.map((item) => `${item.quantity}x ${item.nameSnapshot}`).join(", ")}</div>
      <div className="flex items-center gap-2 pt-0.5"><button onClick={() => onInspect(order)} className="btn-primary flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2 rounded-xl font-semibold border border-white/10">Inspect Order</button>
        <button onClick={() => onAccept(order)} className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 rounded-xl font-bold shadow-lg shadow-emerald-950/40"><Check className="h-3.5 w-3.5" /> Accept & Send to KDS</button></div>
    </div>
  </div>;
}
