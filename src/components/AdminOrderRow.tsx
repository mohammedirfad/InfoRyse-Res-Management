"use client";

import { memo } from "react";
import { Clock, Printer, XCircle } from "lucide-react";
import { formatRupees } from "@/lib/utils";

export type OrderRowItem = { id: string; nameSnapshot: string; quantity: number; priceCentsSnapshot: number };
export type OrderRowData = {
  id: string; orderNumber: number; status: string; totalCents: number; table: { label: string } | null;
  items: OrderRowItem[]; customerName: string | null; notes: string | null; createdAt: string;
};
export type StatusPresentation = { label: string; bg: string; text: string; border: string; dot: string };
export type OrderNextAction = { next: string; label: string; icon: React.ComponentType<{ className?: string }> } | undefined;
type Props = {
  order: OrderRowData; meta: StatusPresentation; nextAction: OrderNextAction; selected: boolean; updating: boolean;
  onSelect: (order: OrderRowData) => void; onPrint: (order: OrderRowData) => void;
  onStatus: (order: OrderRowData, nextStatus: string) => void;
};

function elapsed(createdAt: string) {
  const seconds = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

export const AdminOrderTableRow = memo(function AdminOrderTableRow({ order, meta, nextAction, selected, updating, onSelect, onPrint, onStatus }: Props) {
  const isNew = order.status === "NEW";
  return <tr onClick={() => onSelect(order)} className={`cursor-pointer transition-colors ${selected ? "bg-emerald-50/70" : isNew ? "bg-rose-50/40 hover:bg-rose-50/70" : "hover:bg-slate-50"}`}>
    <td><span className="font-bold text-slate-900 text-sm font-mono">#{order.orderNumber}</span>{isNew && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-rose-500 animate-ping" />}</td>
    <td><div className="flex items-center gap-2"><span className="font-bold text-slate-800 text-xs bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg">{order.table ? `Table ${order.table.label}` : "Takeaway"}</span>{order.customerName && <span className="text-xs text-slate-500 font-medium truncate max-w-[120px]">{order.customerName}</span>}</div></td>
    <td><span className="text-xs text-slate-500 font-medium flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" />{elapsed(order.createdAt)}</span></td>
    <td><div className="flex flex-wrap gap-1 max-w-sm">{order.items.slice(0, 3).map((item) => <span key={item.id} className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200/60">{item.quantity}x {item.nameSnapshot}</span>)}{order.items.length > 3 && <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">+{order.items.length - 3} more</span>}</div></td>
    <td><span className="font-bold text-slate-900 text-sm">{formatRupees(order.totalCents)}</span></td>
    <td><span className={`badge text-xs font-semibold border ${meta.bg} ${meta.text} ${meta.border}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span></td>
    <td className="text-right" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-end gap-1.5">
      <button onClick={() => onPrint(order)} title="Print KOT Ticket" className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"><Printer className="h-4 w-4" /></button>
      {nextAction && <button onClick={() => onStatus(order, nextAction.next)} disabled={updating} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm ${isNew ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"}`}><nextAction.icon className="h-3.5 w-3.5" />{nextAction.label}</button>}
      {isNew && <button onClick={() => onStatus(order, "CANCELLED")} disabled={updating} title="Reject Order" className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"><XCircle className="h-4 w-4" /></button>}
    </div></td>
  </tr>;
});

export const AdminOrderCard = memo(function AdminOrderCard({ order, meta, nextAction, selected, updating, onSelect, onPrint, onStatus }: Props) {
  const isNew = order.status === "NEW";
  return <div onClick={() => onSelect(order)} className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${selected ? "border-emerald-600 ring-2 ring-emerald-600/20" : isNew ? "border-rose-300 ring-1 ring-rose-200/50 shadow-sm" : "border-slate-200/80"}`}>
    <div className="flex items-center justify-between pb-3 border-b border-slate-100"><div className="flex items-center gap-2"><span className="font-mono font-bold text-slate-900 text-base">#{order.orderNumber}</span><span className="font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80">{order.table ? `Table ${order.table.label}` : "Takeaway"}</span></div><span className={`badge text-xs font-semibold ${meta.bg} ${meta.text} border ${meta.border}`}>{meta.label}</span></div>
    <div className="py-3 space-y-1.5 min-h-[90px]">{order.items.map((item) => <div key={item.id} className="flex justify-between items-center text-xs"><span className="font-medium text-slate-800 truncate pr-2"><span className="font-bold text-slate-900 mr-1.5">{item.quantity}x</span>{item.nameSnapshot}</span><span className="text-slate-500 font-mono flex-shrink-0">{formatRupees(item.priceCentsSnapshot * item.quantity)}</span></div>)}</div>
    {order.notes && <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-[11px] text-amber-800 mb-3"><strong>Note:</strong> {order.notes}</div>}
    <div className="pt-3 border-t border-slate-100 flex items-center justify-between"><div><span className="text-xs text-slate-400 block">{elapsed(order.createdAt)}</span><span className="font-bold text-slate-900 text-sm">{formatRupees(order.totalCents)}</span></div><div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}><button onClick={() => onPrint(order)} disabled={updating} className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><Printer className="h-4 w-4" /></button>{nextAction && <button onClick={() => onStatus(order, nextAction.next)} disabled={updating} className={`btn-primary text-xs py-2 px-3 rounded-xl font-bold ${isNew ? "bg-rose-600 text-white" : "bg-slate-900 text-white"}`}>{nextAction.label}</button>}</div></div>
  </div>;
});
