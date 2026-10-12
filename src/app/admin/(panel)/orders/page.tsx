"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search, RefreshCw, X, CheckCircle, XCircle, ChefHat,
  ShoppingBag, Printer, Volume2, VolumeX, Bell, Plus
} from "lucide-react";
import { formatRupees, formatTime } from "@/lib/utils";

type OrderItem = { id: string; nameSnapshot: string; priceCentsSnapshot: number; quantity: number };
type Order = {
  id: string; orderNumber: number; status: string; totalCents: number;
  table: { label: string } | null; items: OrderItem[];
  customerName: string | null; customerPhone: string | null;
  notes: string | null; orderType: string | null; paymentMethod: string | null;
  createdAt: string; statusHistory: { status: string; createdAt: string }[];
};

const TABS = ["All", "New", "Preparing", "Ready", "Completed", "Cancelled"] as const;
const PAGE_SIZE = 20;

const STATUS_META: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  NEW:       { color: "text-red-700",    bg: "bg-red-100",    label: "New",       emoji: "🔴" },
  ACCEPTED:  { color: "text-amber-700",  bg: "bg-amber-100",  label: "Accepted",  emoji: "🟡" },
  PREPARING: { color: "text-blue-700",   bg: "bg-blue-100",   label: "Preparing", emoji: "🔵" },
  READY:     { color: "text-purple-700", bg: "bg-purple-100", label: "Ready",     emoji: "🟣" },
  COMPLETED: { color: "text-green-700",  bg: "bg-green-100",  label: "Completed", emoji: "🟢" },
  CANCELLED: { color: "text-gray-500",   bg: "bg-gray-100",   label: "Cancelled", emoji: "⚫" },
};

const STATUS_BORDER: Record<string, string> = {
  NEW: "border-l-red-400", ACCEPTED: "border-l-amber-400",
  PREPARING: "border-l-blue-400", READY: "border-l-purple-400",
  COMPLETED: "border-l-green-400", CANCELLED: "border-l-gray-200",
};

const NEXT_STATUS: Record<string, string> = {
  NEW: "ACCEPTED", ACCEPTED: "PREPARING", PREPARING: "READY", READY: "COMPLETED",
};

const TAX_RATE = 0.05;
const PACKING  = 2000;

export default function OrdersPage() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<string>("All");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Order | null>(null);
  const [soundOn, setSoundOn]     = useState(true);
  const [newAlert, setNewAlert]   = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage]           = useState(1);

  // Manual order state
  const [showCreate, setShowCreate]   = useState(false);
  const [tables, setTables]           = useState<{ id: string; label: string; section: string | null }[]>([]);
  const [menuItems, setMenuItems]     = useState<{ id: string; name: string; priceCents: number; category: { name: string } }[]>([]);
  const [manualForm, setManualForm]   = useState({
    tableId: "", customerName: "", customerPhone: "", notes: "",
    orderType: "DINE_IN" as const, paymentMethod: "PAY_AT_RESTAURANT" as const,
  });
  const [manualLines, setManualLines] = useState<{ itemId: string; qty: number; name: string; price: number }[]>([]);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const prevNewCount = useRef(0);
  const audioCtx     = useRef<AudioContext | null>(null);
  const pollTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetching   = useRef(false);

  function playBeep() {
    if (!soundOn) return;
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch { /* audio blocked */ }
  }

  const load = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const res  = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: Order[] = data.orders ?? [];
      setOrders(list);
      setLoading(false);
      setSelected(prev => {
        if (!prev) return prev;
        return list.find(o => o.id === prev.id) ?? prev;
      });
      const newCount = list.filter(o => o.status === "NEW").length;
      if (newCount > prevNewCount.current && prevNewCount.current >= 0) {
        playBeep();
        setNewAlert(true);
        setTimeout(() => setNewAlert(false), 4000);
      }
      prevNewCount.current = newCount;
    } catch { /* silent */ }
    finally { isFetching.current = false; }
  }, [soundOn]);

  useEffect(() => {
    let stopped = false;
    async function schedulePoll() {
      if (stopped) return;
      await load();
      if (!stopped) pollTimer.current = setTimeout(schedulePoll, 8000);
    }
    schedulePoll();
    return () => {
      stopped = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [load]);

  // Load tables + menu items when create modal opens
  useEffect(() => {
    if (!showCreate) return;
    Promise.all([
      fetch("/api/admin/tables").then(r => r.json()),
      fetch("/api/admin/menu-items").then(r => r.json()),
    ]).then(([t, m]) => {
      setTables(t.tables ?? []);
      setMenuItems(m.items ?? []);
    });
  }, [showCreate]);

  const filtered = orders.filter(o => {
    const matchTab =
      tab === "All" || o.status === tab.toUpperCase() ||
      (tab === "New" && (o.status === "NEW" || o.status === "ACCEPTED"));
    const matchSearch =
      !search ||
      o.orderNumber.toString().includes(search) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.table?.label.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabCount = (t: string) => {
    if (t === "All") return orders.length;
    if (t === "New") return orders.filter(o => o.status === "NEW" || o.status === "ACCEPTED").length;
    return orders.filter(o => o.status === t.toUpperCase()).length;
  };

  async function updateStatus(order: Order, status: string) {
    const key = order.id + status;
    setUpdatingId(key);
    try {
      await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status } : o));
      setSelected(prev => prev?.id === order.id ? { ...prev, status } : prev);
    } finally {
      setUpdatingId(null);
      load();
    }
  }

  // Bill helpers
  const subtotal = (o: Order) => o.items.reduce((s, i) => s + i.priceCentsSnapshot * i.quantity, 0);
  const tax      = (o: Order) => Math.round(subtotal(o) * TAX_RATE);
  const total    = (o: Order) => subtotal(o) + tax(o) + PACKING;

  // Manual order helpers
  function addLine(item: { id: string; name: string; priceCents: number }) {
    setManualLines(p => {
      const ex = p.find(l => l.itemId === item.id);
      if (ex) return p.map(l => l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l);
      return [...p, { itemId: item.id, qty: 1, name: item.name, price: item.priceCents }];
    });
  }
  function removeLine(itemId: string) { setManualLines(p => p.filter(l => l.itemId !== itemId)); }
  function setLineQty(itemId: string, qty: number) {
    if (qty <= 0) return removeLine(itemId);
    setManualLines(p => p.map(l => l.itemId === itemId ? { ...l, qty } : l));
  }
  const manualTotal = manualLines.reduce((s, l) => s + l.price * l.qty, 0);

  async function submitManualOrder() {
    if (manualLines.length === 0) { setCreateError("Add at least one item"); return; }
    setCreating(true); setCreateError(null);
    const res = await fetch("/api/admin/orders/manual", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...manualForm,
        tableId: manualForm.tableId || undefined,
        items: manualLines.map(l => ({ menuItemId: l.itemId, quantity: l.qty })),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setCreateError(data.error ?? "Failed"); setCreating(false); return; }
    setShowCreate(false);
    setManualLines([]);
    setManualForm({ tableId: "", customerName: "", customerPhone: "", notes: "", orderType: "DINE_IN", paymentMethod: "PAY_AT_RESTAURANT" });
    setCreating(false);
    load();
  }

  function printBill(order: Order) {
    const sub = subtotal(order); const t = tax(order); const tot = total(order);
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Bill #${order.orderNumber}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:13px;padding:16px;max-width:300px}
      h1{font-size:18px;text-align:center;font-family:Georgia,serif;margin-bottom:2px}.center{text-align:center}
      .divider{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;margin:3px 0}
      .total-row{display:flex;justify-content:space-between;font-size:15px;font-weight:bold;border-top:2px solid #000;padding-top:6px;margin-top:6px}
      .footer{text-align:center;margin-top:16px;font-size:11px}</style></head><body>
      <h1>Riverside Café</h1><p class="center" style="font-size:11px;color:#666">Good Food · Brighter Moments</p>
      <div class="divider"></div>
      <div class="row"><span><b>Order #${order.orderNumber}</b></span><span>${new Date(order.createdAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></div>
      <div class="row"><span>Table</span><span>${order.table?.label ?? "Takeaway"}</span></div>
      ${order.customerName ? `<div class="row"><span>Customer</span><span>${order.customerName}</span></div>` : ""}
      <div class="divider"></div>
      ${order.items.map(i => `<div class="row"><span>${i.nameSnapshot} ×${i.quantity}</span><span>₹${((i.priceCentsSnapshot*i.quantity)/100).toFixed(0)}</span></div>`).join("")}
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>₹${(sub/100).toFixed(0)}</span></div>
      <div class="row"><span>GST (5%)</span><span>₹${(t/100).toFixed(0)}</span></div>
      <div class="row"><span>Packing</span><span>₹${(PACKING/100).toFixed(0)}</span></div>
      <div class="total-row"><span>TOTAL</span><span>₹${(tot/100).toFixed(0)}</span></div>
      ${order.paymentMethod ? `<div class="row" style="margin-top:6px"><span>Payment</span><span>${order.paymentMethod.replace(/_/g," ")}</span></div>` : ""}
      <div class="footer"><div class="divider"></div><p>Thank you for dining with us!</p><p style="margin-top:4px">Powered by InfoRyse</p></div>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }

  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="flex h-screen overflow-hidden">

      {/* New order alert */}
      {newAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-3 bg-red-500 text-white px-5 py-3 rounded-2xl shadow-2xl">
            <Bell className="h-5 w-5 animate-bounce" />
            <span className="font-bold">🔔 New Order Arrived!</span>
          </div>
        </div>
      )}

      {/* Main list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-5 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Orders 🌿</h1>
              <p className="text-sm text-gray-400">Live order management · updates every 8s</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSoundOn(s => !s)}
                className={`p-2 rounded-xl transition-colors ${soundOn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                <RefreshCw className="h-4 w-4" />
              </button>
              <button onClick={() => setShowCreate(true)}
                className="btn-primary bg-[#132A1E] text-white text-sm px-4 py-2 rounded-xl">
                <Plus className="h-4 w-4" /> Create Order
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3">
            {TABS.map(t => {
              const count = tabCount(t);
              const isNew = t === "New" && count > 0;
              return (
                <button key={t} onClick={() => { setTab(t); setPage(1); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all
                    ${tab === t ? "bg-[#132A1E] text-white" : "bg-white text-gray-600 border border-black/8"}`}>
                  {t}
                  <span className={`rounded-full px-1.5 py-0.5 text-xs
                    ${tab === t ? "bg-white/20 text-white" : isNew ? "bg-red-100 text-red-600 font-bold animate-pulse" : "bg-gray-100 text-gray-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input className="input pl-10 bg-white" placeholder="Search by order ID, table, customer..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-black/5 p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-28 bg-gray-200 rounded" />
                      <div className="h-3 w-36 bg-gray-200 rounded" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-gray-300">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3" />
              <p className="text-sm font-medium">No orders found</p>
            </div>
          )}

          {!loading && pageOrders.map(o => {
            const meta = STATUS_META[o.status] ?? STATUS_META.NEW;
            const isNew = o.status === "NEW";
            return (
              <div key={o.id} onClick={() => setSelected(o)}
                className={`bg-white rounded-2xl border border-black/5 border-l-4 ${STATUS_BORDER[o.status] ?? ""} p-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.99]
                  ${selected?.id === o.id ? "ring-2 ring-[#132A1E]" : ""}
                  ${isNew ? "shadow-sm shadow-red-100" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0
                      ${isNew ? "bg-red-100" : "bg-gradient-to-br from-amber-50 to-orange-100"}`}>
                      {meta.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 text-sm">#{o.orderNumber}</p>
                        <span className={`badge ${meta.bg} ${meta.color} text-[10px] font-semibold`}>{meta.label}</span>
                        {isNew && <span className="text-[10px] text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full animate-pulse">NEW!</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {o.table ? `Table ${o.table.label}` : "Takeaway"}
                        {o.customerName ? ` · ${o.customerName}` : ""}
                      </p>
                      <p className="text-xs text-gray-400">{formatTime(o.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{formatRupees(o.totalCents)}</p>
                    <p className="text-xs text-gray-400">{o.items.length} item{o.items.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-400">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-primary border border-black/10 text-gray-600 text-sm px-3 py-1.5 rounded-xl disabled:opacity-40">← Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="btn-primary border border-black/10 text-gray-600 text-sm px-3 py-1.5 rounded-xl disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-black/5">
              <h2 className="font-bold text-gray-900 text-lg">Create Order (Staff)</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Table</label>
                  <select className="input" value={manualForm.tableId} onChange={e => setManualForm(f => ({ ...f, tableId: e.target.value }))}>
                    <option value="">Takeaway</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.label}{t.section ? ` (${t.section})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Customer Name</label>
                  <input className="input" placeholder="Optional" value={manualForm.customerName} onChange={e => setManualForm(f => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
                  <input className="input" placeholder="Optional" value={manualForm.customerPhone} onChange={e => setManualForm(f => ({ ...f, customerPhone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Payment</label>
                  <select className="input" value={manualForm.paymentMethod} onChange={e => setManualForm(f => ({ ...f, paymentMethod: e.target.value as any }))}>
                    <option value="PAY_AT_RESTAURANT">Pay at Restaurant</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
              </div>
              <input className="input" placeholder="Special instructions…" value={manualForm.notes} onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))} />
              {manualLines.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Order Items</p>
                  {manualLines.map(l => (
                    <div key={l.itemId} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-gray-900 flex-1 truncate">{l.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setLineQty(l.itemId, l.qty - 1)} className="h-7 w-7 rounded-lg bg-white border border-black/10 text-gray-700 font-bold flex items-center justify-center">−</button>
                        <span className="w-5 text-center font-bold text-sm">{l.qty}</span>
                        <button onClick={() => setLineQty(l.itemId, l.qty + 1)} className="h-7 w-7 rounded-lg bg-[#132A1E] text-white font-bold flex items-center justify-center">+</button>
                      </div>
                      <span className="text-sm font-semibold w-16 text-right">{formatRupees(l.price * l.qty)}</span>
                      <button onClick={() => removeLine(l.itemId)} className="text-red-400"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-black/5">
                    <span>Total</span><span>{formatRupees(manualTotal)}</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Add Items</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {menuItems.map(item => (
                    <button key={item.id} onClick={() => addLine(item)}
                      className="flex items-center justify-between rounded-xl border border-black/8 px-3 py-2.5 text-sm hover:bg-gray-50 active:scale-[0.97] transition-all text-left">
                      <div className="min-w-0"><p className="font-medium text-gray-900 truncate">{item.name}</p><p className="text-xs text-gray-400">{item.category?.name}</p></div>
                      <span className="text-xs font-semibold text-gray-700 ml-2 flex-shrink-0">{formatRupees(item.priceCents)}</span>
                    </button>
                  ))}
                </div>
              </div>
              {createError && <p className="text-sm text-red-600 font-medium">{createError}</p>}
            </div>
            <div className="p-5 border-t border-black/5 grid grid-cols-2 gap-2">
              <button onClick={() => setShowCreate(false)} className="btn-primary border-2 border-black/10 text-gray-600 justify-center py-3 rounded-2xl text-sm">Cancel</button>
              <button onClick={submitManualOrder} disabled={creating || manualLines.length === 0}
                className="btn-primary bg-[#132A1E] text-white justify-center py-3 rounded-2xl text-sm disabled:opacity-50">
                {creating ? "Creating…" : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail side panel */}
      {selected && (
        <div className="w-96 flex-shrink-0 border-l border-black/5 bg-white flex flex-col overflow-hidden animate-slide-in-right">
          <div className="flex items-center justify-between p-5 border-b border-black/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className={`badge ${STATUS_META[selected.status]?.bg} ${STATUS_META[selected.status]?.color} font-semibold`}>
                {STATUS_META[selected.status]?.emoji} {STATUS_META[selected.status]?.label}
              </span>
              <span className="font-bold text-gray-900">#{selected.orderNumber}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => printBill(selected)} className="p-2 rounded-xl hover:bg-green-50 text-green-600"><Printer className="h-4 w-4" /></button>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { l:"Table",   v: selected.table?.label ? `Table ${selected.table.label}` : "Takeaway" },
                { l:"Time",    v: formatTime(selected.createdAt) },
                { l:"Type",    v: selected.orderType?.replace("_"," ") ?? "DINE IN" },
                { l:"Payment", v: selected.paymentMethod?.replace(/_/g," ") ?? "Pay at counter" },
              ].map(({ l, v }) => (
                <div key={l} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{l}</p>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">{v}</p>
                </div>
              ))}
            </div>

            {/* Status stepper */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Progress</p>
              <div className="flex items-center">
                {["NEW","ACCEPTED","PREPARING","READY","COMPLETED"].map((s, i, arr) => {
                  const idx = arr.indexOf(selected.status);
                  const done = i <= idx;
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done?"bg-[#132A1E] text-white":"bg-gray-100 text-gray-400"}`}>
                          {done?"✓":i+1}
                        </div>
                        <p className="text-[8px] text-gray-400 mt-1 whitespace-nowrap">{["New","Accepted","Preparing","Ready","Done"][i]}</p>
                      </div>
                      {i < arr.length-1 && <div className={`h-0.5 flex-1 mx-0.5 mb-3 ${i<idx?"bg-[#132A1E]":"bg-gray-100"}`}/>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Items ({selected.items.length})</p>
              <div className="space-y-1.5">
                {selected.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-lg bg-[#132A1E] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{item.quantity}</span>
                      <span className="text-sm text-gray-800 font-medium">{item.nameSnapshot}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatRupees(item.priceCentsSnapshot * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {selected.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-amber-700 mb-1">Special Instructions</p>
                <p className="text-sm text-amber-800">{selected.notes}</p>
              </div>
            )}

            {/* Bill */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Bill Summary</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatRupees(subtotal(selected))}</span></div>
                <div className="flex justify-between text-gray-600"><span>GST (5%)</span><span>{formatRupees(tax(selected))}</span></div>
                <div className="flex justify-between text-gray-600"><span>Packing</span><span>{formatRupees(PACKING)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2.5 border-t border-black/5">
                  <span>Total</span><span>{formatRupees(total(selected))}</span>
                </div>
              </div>
            </div>

            {(selected.customerName || selected.customerPhone) && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Customer</p>
                {selected.customerName && <p className="font-semibold text-gray-900">{selected.customerName}</p>}
                {selected.customerPhone && <p className="text-sm text-gray-500">{selected.customerPhone}</p>}
              </div>
            )}

            {/* Timeline */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Timeline</p>
              <div className="space-y-2.5">
                {[...(selected.statusHistory ?? [])].reverse().map((h, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#132A1E] mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{STATUS_META[h.status]?.label ?? h.status}</p>
                      <p className="text-xs text-gray-400">{formatTime(h.createdAt)}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                  <div><p className="text-sm text-gray-500">Order placed</p><p className="text-xs text-gray-400">{formatTime(selected.createdAt)}</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-5 border-t border-black/5 space-y-2 flex-shrink-0">
            <button onClick={() => printBill(selected)} className="btn-primary w-full border-2 border-gray-200 text-gray-600 justify-center py-3 rounded-2xl text-sm hover:bg-gray-50">
              <Printer className="h-4 w-4" /> Print Bill / KOT
            </button>
            {selected.status !== "COMPLETED" && selected.status !== "CANCELLED" && (
              <>
                {selected.status === "NEW" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => updateStatus(selected, "CANCELLED")} disabled={updatingId !== null}
                      className="btn-primary border-2 border-red-200 text-red-600 justify-center py-3 rounded-2xl text-sm hover:bg-red-50 disabled:opacity-60">
                      {updatingId === selected.id + "CANCELLED"
                        ? <><span className="h-3.5 w-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin inline-block" /> Rejecting…</>
                        : <><XCircle className="h-4 w-4" /> Reject</>}
                    </button>
                    <button onClick={() => updateStatus(selected, "ACCEPTED")} disabled={updatingId !== null}
                      className="btn-primary bg-[#132A1E] text-white justify-center py-3 rounded-2xl text-sm disabled:opacity-60">
                      {updatingId === selected.id + "ACCEPTED"
                        ? <><span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Accepting…</>
                        : <><CheckCircle className="h-4 w-4" /> Accept</>}
                    </button>
                  </div>
                )}
                {NEXT_STATUS[selected.status] && selected.status !== "NEW" && (
                  <button onClick={() => updateStatus(selected, NEXT_STATUS[selected.status])} disabled={updatingId !== null}
                    className="btn-primary w-full bg-[#132A1E] text-white justify-center py-3 rounded-2xl text-sm disabled:opacity-60">
                    {updatingId === selected.id + NEXT_STATUS[selected.status]
                      ? <><span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Updating…</>
                      : <><ChefHat className="h-4 w-4" /> Mark as {NEXT_STATUS[selected.status].replace("_", " ")}</>}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
