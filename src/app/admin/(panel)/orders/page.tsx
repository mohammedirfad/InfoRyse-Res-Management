"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Search, RefreshCw, X, CheckCircle2, XCircle, ChefHat,
  ShoppingBag, Printer, Volume2, VolumeX, Bell, Plus,
  Clock, ArrowRight, UtensilsCrossed, LayoutList, LayoutGrid,
  Check, AlertCircle, ChevronDown, Sparkles
} from "lucide-react";
import { formatRupees, formatTime } from "@/lib/utils";

type OrderItem = { id: string; nameSnapshot: string; priceCentsSnapshot: number; quantity: number };
type Order = {
  id: string;
  orderNumber: number;
  status: string;
  totalCents: number;
  table: { label: string } | null;
  items: OrderItem[];
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  orderType: string | null;
  paymentMethod: string | null;
  createdAt: string;
  statusHistory: { status: string; createdAt: string }[];
};

const TABS = ["All", "New", "Preparing", "Ready", "Completed", "Cancelled"] as const;
const INITIAL_VISIBLE_COUNT = 15;
const SCROLL_BATCH_SIZE = 15;

const STATUS_META: Record<string, { label: string; bg: string; text: string; border: string; glow: string; dot: string }> = {
  NEW: {
    label: "New Order",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    glow: "shadow-rose-100",
    dot: "bg-rose-500",
  },
  ACCEPTED: {
    label: "Accepted",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    glow: "shadow-amber-100",
    dot: "bg-amber-500",
  },
  PREPARING: {
    label: "In Kitchen",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    glow: "shadow-sky-100",
    dot: "bg-sky-500",
  },
  READY: {
    label: "Ready to Serve",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    glow: "shadow-purple-100",
    dot: "bg-purple-500",
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    glow: "shadow-emerald-100",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    glow: "shadow-none",
    dot: "bg-slate-400",
  },
};

const NEXT_STATUS: Record<string, { next: string; label: string; icon: any }> = {
  NEW: { next: "ACCEPTED", label: "Accept", icon: CheckCircle2 },
  ACCEPTED: { next: "PREPARING", label: "Send to Kitchen", icon: ChefHat },
  PREPARING: { next: "READY", label: "Mark Ready", icon: Sparkles },
  READY: { next: "COMPLETED", label: "Complete Order", icon: Check },
};

function formatElapsed(createdAt: string): string {
  const diffSec = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ${diffMin % 60}m ago`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Progressive scroll pagination limit
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Luxury dynamic toast state
  const [arrivalToastOrder, setArrivalToastOrder] = useState<Order | null>(null);
  const [toastTimerProgress, setToastTimerProgress] = useState(100);

  // Manual order modal state
  const [showCreate, setShowCreate] = useState(false);
  const [tables, setTables] = useState<{ id: string; label: string; section: string | null }[]>([]);
  const [menuItems, setMenuItems] = useState<{ id: string; name: string; priceCents: number; category: { name: string } }[]>([]);
  const [manualForm, setManualForm] = useState({
    tableId: "",
    customerName: "",
    customerPhone: "",
    notes: "",
    orderType: "DINE_IN" as const,
    paymentMethod: "PAY_AT_RESTAURANT" as const,
  });
  const [manualLines, setManualLines] = useState<{ itemId: string; qty: number; name: string; price: number }[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const prevNewCount = useRef(-1);
  const audioCtx = useRef<AudioContext | null>(null);
  const isFetching = useRef(false);

  // Dual-tone executive chime for incoming orders
  function playExecutiveChime() {
    if (!soundOn) return;
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtx.current;
      if (ctx.state === "suspended") ctx.resume();

      // Note 1: 880 Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.25, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);

      // Note 2: 1320 Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio context restricted by browser policy
    }
  }

  // Serverless instances do not share the in-memory EventEmitter. Polling
  // gives every Vercel instance the same reliable source of truth.
  const load = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: Order[] = data.orders ?? [];
      setOrders(list);
      setLoading(false);

      setSelected((prev) => {
        if (!prev) return prev;
        return list.find((o) => o.id === prev.id) ?? prev;
      });

      const newOrders = list.filter((o) => o.status === "NEW");
      if (prevNewCount.current !== -1 && newOrders.length > prevNewCount.current) {
        // Trigger high-end notification banner & audio
        playExecutiveChime();
        const latestNewOrder = newOrders[0];
        setArrivalToastOrder(latestNewOrder);
        setToastTimerProgress(100);
      }
      prevNewCount.current = newOrders.length;
    } catch {
      // silent
    } finally {
      isFetching.current = false;
    }
  }, [soundOn]);

  useEffect(() => {
    // Initial fetch
    load();

    const interval = window.setInterval(load, 10000);
    return () => window.clearInterval(interval);
  }, [load]);

  // Toast auto-dismiss progress bar timer
  useEffect(() => {
    if (!arrivalToastOrder) return;
    const interval = setInterval(() => {
      setToastTimerProgress((prev) => {
        if (prev <= 0) {
          setArrivalToastOrder(null);
          return 100;
        }
        return prev - 2;
      });
    }, 140);
    return () => clearInterval(interval);
  }, [arrivalToastOrder]);

  // Load tables + menu items when manual create modal opens
  useEffect(() => {
    if (!showCreate) return;
    Promise.all([
      fetch("/api/admin/tables").then((r) => r.json()),
      fetch("/api/admin/menu-items").then((r) => r.json()),
    ]).then(([t, m]) => {
      setTables(t.tables ?? []);
      setMenuItems(m.items ?? []);
    });
  }, [showCreate]);

  // Handle scroll pagination
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 120) {
      setVisibleCount((prev) => prev + SCROLL_BATCH_SIZE);
    }
  }

  // Filtered orders
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchTab =
        tab === "All" ||
        o.status === tab.toUpperCase() ||
        (tab === "New" && (o.status === "NEW" || o.status === "ACCEPTED"));

      const query = search.toLowerCase();
      const matchSearch =
        !search ||
        o.orderNumber.toString().includes(query) ||
        (o.customerName && o.customerName.toLowerCase().includes(query)) ||
        (o.table?.label && o.table.label.toLowerCase().includes(query)) ||
        o.items.some((i) => i.nameSnapshot.toLowerCase().includes(query));

      return matchTab && matchSearch;
    });
  }, [orders, tab, search]);

  const visibleOrders = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  const tabCounts = useMemo(() => {
    return {
      All: orders.length,
      New: orders.filter((o) => o.status === "NEW" || o.status === "ACCEPTED").length,
      Preparing: orders.filter((o) => o.status === "PREPARING").length,
      Ready: orders.filter((o) => o.status === "READY").length,
      Completed: orders.filter((o) => o.status === "COMPLETED").length,
      Cancelled: orders.filter((o) => o.status === "CANCELLED").length,
    };
  }, [orders]);

  async function updateStatus(order: Order, nextStatus: string) {
    const key = order.id + nextStatus;
    setUpdatingId(key);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o))
        );
        setSelected((prev) =>
          prev?.id === order.id ? { ...prev, status: nextStatus } : prev
        );
        if (arrivalToastOrder?.id === order.id) {
          setArrivalToastOrder(null);
        }
      }
    } finally {
      setUpdatingId(null);
      load();
    }
  }

  function printBill(order: Order) {
    const sub = order.items.reduce((s, i) => s + i.priceCentsSnapshot * i.quantity, 0);
    const win = window.open("", "_blank", "width=380,height=600");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>KOT #${order.orderNumber}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Courier New',monospace;font-size:12px;padding:16px;max-width:320px;margin:0 auto}
        h1{font-size:18px;text-align:center;font-weight:bold;margin-bottom:2px}
        .center{text-align:center}
        .divider{border-top:1px dashed #000;margin:8px 0}
        .row{display:flex;justify-content:space-between;margin:4px 0}
        .total-row{display:flex;justify-content:space-between;font-size:14px;font-weight:bold;border-top:2px solid #000;padding-top:6px;margin-top:6px}
        .footer{text-align:center;margin-top:14px;font-size:10px}
      </style></head><body>
      <h1>KITCHEN ORDER TICKET</h1>
      <p class="center" style="font-size:11px;color:#333">Live Table Service</p>
      <div class="divider"></div>
      <div class="row"><span><b>ORDER #${order.orderNumber}</b></span><span>${new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></div>
      <div class="row"><span>Table Location</span><span><b>${order.table ? `TABLE ${order.table.label}` : "TAKEAWAY"}</b></span></div>
      ${order.customerName ? `<div class="row"><span>Guest</span><span>${order.customerName}</span></div>` : ""}
      <div class="divider"></div>
      ${order.items.map((i) => `<div class="row"><span><b>${i.quantity}x</b> ${i.nameSnapshot}</span><span>₹${((i.priceCentsSnapshot * i.quantity) / 100).toFixed(0)}</span></div>`).join("")}
      <div class="divider"></div>
      <div class="total-row"><span>TOTAL AMOUNT</span><span>₹${(sub / 100).toFixed(0)}</span></div>
      ${order.notes ? `<div style="margin-top:8px;padding:6px;border:1px solid #000"><b>Note:</b> ${order.notes}</div>` : ""}
      <div class="footer"><div class="divider"></div><p>InfoRyse Kitchen Display System</p></div>
      </body></html>`);
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 350);
  }

  // Manual order helpers
  function addManualLine(item: { id: string; name: string; priceCents: number }) {
    setManualLines((p) => {
      const ex = p.find((l) => l.itemId === item.id);
      if (ex) return p.map((l) => (l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l));
      return [...p, { itemId: item.id, qty: 1, name: item.name, price: item.priceCents }];
    });
  }
  function removeManualLine(itemId: string) {
    setManualLines((p) => p.filter((l) => l.itemId !== itemId));
  }
  function setManualLineQty(itemId: string, qty: number) {
    if (qty <= 0) return removeManualLine(itemId);
    setManualLines((p) => p.map((l) => (l.itemId === itemId ? { ...l, qty } : l)));
  }
  const manualTotal = manualLines.reduce((s, l) => s + l.price * l.qty, 0);

  async function submitManualOrder() {
    if (manualLines.length === 0) {
      setCreateError("Please add at least one menu item.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...manualForm,
          tableId: manualForm.tableId || undefined,
          items: manualLines.map((l) => ({ menuItemId: l.itemId, quantity: l.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Failed to create order");
        return;
      }
      setShowCreate(false);
      setManualLines([]);
      setManualForm({
        tableId: "",
        customerName: "",
        customerPhone: "",
        notes: "",
        orderType: "DINE_IN",
        paymentMethod: "PAY_AT_RESTAURANT",
      });
      load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Luxury Order Arrival Toast (Floating Dynamic Island) ─────────────── */}
      {arrivalToastOrder && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 animate-toast-enter">
          <div className="bg-slate-950/95 backdrop-blur-xl text-white rounded-3xl p-4 shadow-2xl border border-white/20 relative overflow-hidden flex flex-col gap-3">
            {/* Progress bar */}
            <div
              className="absolute top-0 left-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-150 ease-linear"
              style={{ width: `${toastTimerProgress}%` }}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center flex-shrink-0 relative">
                  <Bell className="h-5 w-5 animate-bounce" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 animate-ping" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      New Order Incoming
                    </span>
                    <span className="font-bold text-white text-sm">
                      #{arrivalToastOrder.orderNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    {arrivalToastOrder.table ? (
                      <span className="text-amber-300 font-bold">Table {arrivalToastOrder.table.label}</span>
                    ) : (
                      "Takeaway"
                    )}
                    {arrivalToastOrder.customerName ? ` · ${arrivalToastOrder.customerName}` : ""}
                    {" · "}
                    <span className="text-white font-bold">{formatRupees(arrivalToastOrder.totalCents)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setArrivalToastOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dish quick snippet */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 truncate">
              {arrivalToastOrder.items.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(", ")}
            </div>

            {/* Quick Actions directly on Toast */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => {
                  setSelected(arrivalToastOrder);
                  setArrivalToastOrder(null);
                }}
                className="btn-primary flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2 rounded-xl font-semibold border border-white/10"
              >
                Inspect Order
              </button>
              <button
                onClick={() => updateStatus(arrivalToastOrder, "ACCEPTED")}
                className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 rounded-xl font-bold shadow-lg shadow-emerald-950/40"
              >
                <Check className="h-3.5 w-3.5" /> Accept & Send to KDS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Order Management Surface ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <div className="p-5 pb-3 bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-3.5 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Kitchen Display & Orders
                </h1>
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync (6s)
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor incoming diner orders, dispatch tickets to chef station, and track order fulfillment.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Sound alert toggle */}
              <button
                onClick={() => setSoundOn((s) => !s)}
                title={soundOn ? "Mute audio chimes" : "Enable order chimes"}
                className={`p-2 rounded-xl border transition-all ${
                  soundOn
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-400 border-slate-200"
                }`}
              >
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              {/* View Switcher */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                <button
                  onClick={() => setViewMode("table")}
                  title="List / Table View"
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    viewMode === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  title="KDS Cards View"
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    viewMode === "cards" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={load}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              {/* Create Manual Order */}
              <button
                onClick={() => setShowCreate(true)}
                className="btn-primary bg-[#132A1E] hover:bg-emerald-950 text-white text-xs px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> New Order
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {TABS.map((t) => {
                const count = (tabCounts as any)[t] ?? 0;
                const isNew = t === "New" && count > 0;
                const isActive = tab === t;

                return (
                  <button
                    key={t}
                    onClick={() => {
                      setTab(t);
                      setVisibleCount(INITIAL_VISIBLE_COUNT);
                    }}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#132A1E] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-transparent"
                    }`}
                  >
                    <span>{t}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : isNew
                          ? "bg-rose-500 text-white animate-pulse"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                className="input pl-9 py-1.5 text-xs bg-slate-50 border-slate-200"
                placeholder="Search order #, table, dish, customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(INITIAL_VISIBLE_COUNT);
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Order Listing with Scroll Pagination ────────────────────────────── */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-5 space-y-3"
        >
          {loading && orders.length === 0 ? (
            <div className="py-20 text-center text-slate-400">Loading live orders...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-semibold">No orders in this view</p>
              <p className="text-xs text-slate-400 mt-1">New incoming diner orders will appear automatically.</p>
            </div>
          ) : viewMode === "table" ? (
            /* ── Streamlined Executive Table View ────────────────────────────── */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <table className="w-full data-table">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th>Order</th>
                    <th>Table / Location</th>
                    <th>Elapsed</th>
                    <th>Items Summary</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th className="text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((o) => {
                    const meta = STATUS_META[o.status] ?? STATUS_META.NEW;
                    const nextAction = NEXT_STATUS[o.status];
                    const isNew = o.status === "NEW";
                    const isSelected = selected?.id === o.id;

                    return (
                      <tr
                        key={o.id}
                        onClick={() => setSelected(o)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-emerald-50/70"
                            : isNew
                            ? "bg-rose-50/40 hover:bg-rose-50/70"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm font-mono">
                              #{o.orderNumber}
                            </span>
                            {isNew && (
                              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                              {o.table ? `Table ${o.table.label}` : "Takeaway"}
                            </span>
                            {o.customerName && (
                              <span className="text-xs text-slate-500 font-medium truncate max-w-[120px]">
                                {o.customerName}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {formatElapsed(o.createdAt)}
                          </span>
                        </td>

                        <td>
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {o.items.slice(0, 3).map((item) => (
                              <span
                                key={item.id}
                                className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200/60"
                              >
                                {item.quantity}x {item.nameSnapshot}
                              </span>
                            ))}
                            {o.items.length > 3 && (
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                +{o.items.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="font-bold text-slate-900 text-sm">
                            {formatRupees(o.totalCents)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`badge text-xs font-semibold border ${meta.bg} ${meta.text} ${meta.border}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>

                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => printBill(o)}
                              title="Print KOT Ticket"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              <Printer className="h-4 w-4" />
                            </button>

                            {nextAction && (
                              <button
                                onClick={() => updateStatus(o, nextAction.next)}
                                disabled={updatingId !== null}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm ${
                                  isNew
                                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                                    : "bg-slate-900 hover:bg-slate-800 text-white"
                                }`}
                              >
                                <nextAction.icon className="h-3.5 w-3.5" />
                                {nextAction.label}
                              </button>
                            )}

                            {isNew && (
                              <button
                                onClick={() => updateStatus(o, "CANCELLED")}
                                title="Reject Order"
                                className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── Modern KDS Cards View ────────────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {visibleOrders.map((o) => {
                const meta = STATUS_META[o.status] ?? STATUS_META.NEW;
                const nextAction = NEXT_STATUS[o.status];
                const isNew = o.status === "NEW";
                const isSelected = selected?.id === o.id;

                return (
                  <div
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? "border-emerald-600 ring-2 ring-emerald-600/20"
                        : isNew
                        ? "border-rose-300 ring-1 ring-rose-200/50 shadow-sm"
                        : "border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-base">
                          #{o.orderNumber}
                        </span>
                        <span className="font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80">
                          {o.table ? `Table ${o.table.label}` : "Takeaway"}
                        </span>
                      </div>
                      <span className={`badge text-xs font-semibold ${meta.bg} ${meta.text} border ${meta.border}`}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="py-3 space-y-1.5 min-h-[90px]">
                      {o.items.map((i) => (
                        <div key={i.id} className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">
                            <span className="font-bold text-slate-900 mr-1.5">{i.quantity}x</span>
                            {i.nameSnapshot}
                          </span>
                          <span className="text-slate-500 font-mono flex-shrink-0">
                            {formatRupees(i.priceCentsSnapshot * i.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {o.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-[11px] text-amber-800 mb-3">
                        <strong>Note:</strong> {o.notes}
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">{formatElapsed(o.createdAt)}</span>
                        <span className="font-bold text-slate-900 text-sm">{formatRupees(o.totalCents)}</span>
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => printBill(o)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {nextAction && (
                          <button
                            onClick={() => updateStatus(o, nextAction.next)}
                            className={`btn-primary text-xs py-2 px-3 rounded-xl font-bold ${
                              isNew ? "bg-rose-600 text-white" : "bg-slate-900 text-white"
                            }`}
                          >
                            {nextAction.label}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Scroll Pagination Feedback Indicator ────────────────────────── */}
          {filtered.length > 0 && (
            <div className="py-4 text-center">
              {visibleCount < filtered.length ? (
                <button
                  onClick={() => setVisibleCount((prev) => prev + SCROLL_BATCH_SIZE)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm inline-flex items-center gap-1.5"
                >
                  <span>Showing {visibleOrders.length} of {filtered.length} orders · Load more</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium">
                  ✓ All {filtered.length} orders loaded
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Order Detail Side Panel ─────────────────────────────────────────── */}
      {selected && (
        <div className="w-96 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden animate-slide-in-right shadow-xl">
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg">#{selected.orderNumber}</span>
              <span
                className={`badge text-xs font-semibold ${STATUS_META[selected.status]?.bg} ${STATUS_META[selected.status]?.text}`}
              >
                {STATUS_META[selected.status]?.label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => printBill(selected)}
                title="Print KOT Receipt"
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Meta tags */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Table</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selected.table ? `Table ${selected.table.label}` : "Takeaway"}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Received</span>
                <span className="font-bold text-slate-900 text-sm">{formatTime(selected.createdAt)}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Order Type</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selected.orderType?.replace("_", " ") ?? "DINE IN"}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Payment</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selected.paymentMethod?.replace(/_/g, " ") ?? "Pay at counter"}
                </span>
              </div>
            </div>

            {/* Customer info */}
            {(selected.customerName || selected.customerPhone) && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
                <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Guest Information</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selected.customerName || "Walk-in Guest"}</p>
                {selected.customerPhone && (
                  <p className="text-slate-500 font-mono">{selected.customerPhone}</p>
                )}
              </div>
            )}

            {/* Special notes */}
            {selected.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">
                  Kitchen Notes & Instructions
                </span>
                <p className="leading-relaxed">{selected.notes}</p>
              </div>
            )}

            {/* Items list */}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Order Items ({selected.items.length})
              </span>
              <div className="space-y-1.5">
                {selected.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                        {item.quantity}
                      </span>
                      <span className="font-semibold text-slate-800">{item.nameSnapshot}</span>
                    </div>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatRupees(item.priceCentsSnapshot * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono">{formatRupees(selected.totalCents)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-200">
                <span>Total Amount</span>
                <span>{formatRupees(selected.totalCents)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons in drawer */}
          <div className="p-4 border-t border-slate-200 space-y-2 bg-slate-50">
            {selected.status !== "COMPLETED" && selected.status !== "CANCELLED" && (
              <>
                {selected.status === "NEW" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateStatus(selected, "CANCELLED")}
                      disabled={updatingId !== null}
                      className="btn-primary border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 justify-center py-2.5 rounded-xl text-xs font-bold"
                    >
                      Reject Order
                    </button>
                    <button
                      onClick={() => updateStatus(selected, "ACCEPTED")}
                      disabled={updatingId !== null}
                      className="btn-primary bg-[#132A1E] text-white hover:bg-emerald-950 justify-center py-2.5 rounded-xl text-xs font-bold shadow-md"
                    >
                      Accept Order
                    </button>
                  </div>
                )}
                {NEXT_STATUS[selected.status] && selected.status !== "NEW" && (
                  <button
                    onClick={() => updateStatus(selected, NEXT_STATUS[selected.status].next)}
                    disabled={updatingId !== null}
                    className="btn-primary w-full bg-[#132A1E] text-white hover:bg-emerald-950 justify-center py-3 rounded-xl text-xs font-bold shadow-md"
                  >
                    Move to {NEXT_STATUS[selected.status].label}
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => printBill(selected)}
              className="btn-primary w-full border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 justify-center py-2.5 rounded-xl text-xs font-semibold"
            >
              <Printer className="h-4 w-4" /> Print Thermal Ticket
            </button>
          </div>
        </div>
      )}

      {/* ── Create Manual Order Modal ───────────────────────────────────────── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-pop flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base">New Dining / Takeaway Order</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Table</label>
                  <select
                    className="input text-xs"
                    value={manualForm.tableId}
                    onChange={(e) => setManualForm({ ...manualForm, tableId: e.target.value })}
                  >
                    <option value="">Takeaway / Counter</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} {t.section ? `(${t.section})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Guest Name</label>
                  <input
                    className="input text-xs"
                    placeholder="Optional"
                    value={manualForm.customerName}
                    onChange={(e) => setManualForm({ ...manualForm, customerName: e.target.value })}
                  />
                </div>
              </div>

              {/* Order items selection */}
              <div>
                <span className="font-bold text-slate-700 mb-2 block uppercase tracking-wider text-[10px]">
                  Menu Items
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addManualLine(item)}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-400 text-left flex justify-between items-center transition-all"
                    >
                      <div className="truncate pr-1">
                        <p className="font-bold text-slate-800 text-xs truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.category?.name}</p>
                      </div>
                      <span className="font-bold text-slate-900 font-mono text-xs flex-shrink-0">
                        {formatRupees(item.priceCents)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected items */}
              {manualLines.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Selected Dishes
                  </span>
                  {manualLines.map((l) => (
                    <div key={l.itemId} className="flex items-center justify-between">
                      <span className="font-medium text-slate-800 flex-1 truncate">{l.name}</span>
                      <div className="flex items-center gap-2 mr-3">
                        <button
                          type="button"
                          onClick={() => setManualLineQty(l.itemId, l.qty - 1)}
                          className="h-6 w-6 rounded bg-white border border-slate-200 font-bold"
                        >
                          -
                        </button>
                        <span className="font-bold font-mono">{l.qty}</span>
                        <button
                          type="button"
                          onClick={() => setManualLineQty(l.itemId, l.qty + 1)}
                          className="h-6 w-6 rounded bg-slate-900 text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-bold font-mono">{formatRupees(l.price * l.qty)}</span>
                      <button
                        type="button"
                        onClick={() => removeManualLine(l.itemId)}
                        className="text-rose-500 ml-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                    <span>Total</span>
                    <span>{formatRupees(manualTotal)}</span>
                  </div>
                </div>
              )}

              {createError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {createError}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn-primary border border-slate-200 flex-1 justify-center py-2.5 rounded-xl text-xs text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating || manualLines.length === 0}
                onClick={submitManualOrder}
                className="btn-primary bg-[#132A1E] text-white flex-1 justify-center py-2.5 rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
              >
                {creating ? "Submitting..." : "Send to Kitchen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
