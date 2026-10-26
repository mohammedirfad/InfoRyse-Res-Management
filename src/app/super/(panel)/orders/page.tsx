"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { formatRupees, formatTime } from "@/lib/utils";

type Order = {
  id: string; orderNumber: number; status: string; totalCents: number; customerName: string | null; createdAt: string;
  table: { label: string } | null; restaurant: { id: string; name: string };
  items: { nameSnapshot: string; quantity: number; priceCentsSnapshot: number }[];
};
type ResponseData = { orders: Order[]; pagination: { page: number; totalPages: number; total: number }; stats: { total: number; completed: number; cancelled: number; orderValueCents: number } };

const STATUSES = ["NEW", "ACCEPTED", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

export default function SuperOrdersPage() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams({ page: String(page), limit: "50", search, status });
      const response = await fetch(`/api/super/orders?${query}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load platform orders.");
      setData(body); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load platform orders."); }
  }, [page, search, status]);
  useEffect(() => { load(); }, [load]);

  const metrics = [
    ["All orders", data?.stats.total], ["Completed", data?.stats.completed],
    ["Cancelled", data?.stats.cancelled], ["Order value", data ? formatRupees(data.stats.orderValueCents) : undefined],
  ];
  return <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-slate-50">
    <header className="border-b border-slate-200 bg-white p-4 sm:p-6"><h1 className="text-xl font-bold text-slate-900">Platform Orders</h1><p className="mt-1 text-sm text-slate-500">Orders across all restaurants, loaded from the platform database.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">{metrics.map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-lg font-bold text-slate-900">{value === undefined ? "—" : typeof value === "number" ? value.toLocaleString("en-IN") : value}</p><p className="text-xs text-slate-500">{label}</p></div>)}</div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} className="input pl-9" placeholder="Search order, customer, or restaurant" /></div><select className="input sm:w-52" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="all">All statuses</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
    </header>
    {error && <p role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="min-w-0 flex-1 overflow-auto"><table className="w-full min-w-[760px] text-sm"><thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase text-slate-500"><tr>{["Order", "Restaurant", "Customer", "Table", "Amount", "Status", "Date"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white">{data?.orders.map((order) => <tr key={order.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(order)}><td className="px-4 py-3 font-semibold text-blue-700">#{order.orderNumber}</td><td className="px-4 py-3">{order.restaurant.name}</td><td className="px-4 py-3">{order.customerName || "Guest"}</td><td className="px-4 py-3">{order.table?.label || "—"}</td><td className="px-4 py-3">{formatRupees(order.totalCents)}</td><td className="px-4 py-3">{order.status}</td><td className="px-4 py-3 whitespace-nowrap">{formatTime(order.createdAt)}</td></tr>)}{data?.orders.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No matching orders in the database.</td></tr>}</tbody></table></div>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"><span>{data ? `Page ${data.pagination.page} of ${data.pagination.totalPages} · ${data.pagination.total.toLocaleString("en-IN")} matching orders` : "Loading orders…"}</span><div className="flex gap-2"><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button><button aria-label="Next page" disabled={!data || page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button></div></footer>
    {selected && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onClick={() => setSelected(null)}><aside role="dialog" aria-modal="true" aria-label="Order details" onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"><header className="flex items-center justify-between border-b p-5"><div><p className="font-bold">Order #{selected.orderNumber}</p><p className="text-xs text-slate-500">{selected.restaurant.name} · {selected.status}</p></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5"/></button></header><div className="space-y-4 p-5"><div className="rounded-xl bg-slate-50 p-4 text-sm"><p>{selected.customerName || "Guest"}</p><p className="mt-1 text-slate-500">{selected.table ? `Table ${selected.table.label}` : "Takeaway"}</p><p className="mt-1 text-slate-500">{new Date(selected.createdAt).toLocaleString("en-IN")}</p></div><div>{selected.items.map((item, index) => <div key={`${item.nameSnapshot}-${index}`} className="flex justify-between border-b py-3 text-sm"><span>{item.nameSnapshot} × {item.quantity}</span><span>{formatRupees(item.priceCentsSnapshot * item.quantity)}</span></div>)}</div><div className="flex justify-between font-bold"><span>Total</span><span>{formatRupees(selected.totalCents)}</span></div></div></aside></div>}
  </div>;
}
