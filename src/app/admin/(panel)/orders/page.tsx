"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Search, RefreshCw, X, CheckCircle2, XCircle, ChefHat,
  ShoppingBag, Printer, Plus,
  Clock, ArrowRight, UtensilsCrossed, LayoutList, LayoutGrid,
  Check, AlertCircle, Sparkles
} from "lucide-react";
import { formatRupees, formatTime } from "@/lib/utils";
import { fetchJsonCached, invalidateCache, peekCache } from "@/lib/cachedFetch";
import { saveAdminRouteData } from "@/lib/adminPrefetch";
import OrderMenuPicker from "@/components/OrderMenuPicker";
import { AdminOrderCard, AdminOrderTableRow, type OrderRowData } from "@/components/AdminOrderRow";
import OrderArrivalToast from "@/components/OrderArrivalToast";

type OrderItem = { id: string; menuItemId: string | null; nameSnapshot: string; priceCentsSnapshot: number; quantity: number; servedQuantity: number; cancelledQuantity: number };
type MenuCategory = { id: string; name: string };
type PickerLine = { itemId: string; qty: number; name: string; price: number };
type Order = {
  id: string;
  orderNumber: number;
  status: string;
  totalCents: number;
  table: { label: string } | null;
  items: OrderItem[];
  customerName: string | null;
  customerPhone: string | null;
  customerEmail?: string | null;
  notes: string | null;
  orderType: string | null;
  paymentMethod: string | null;
  createdAt: string;
};

const TABS = ["All", "New", "Preparing", "Ready", "Completed", "Cancelled"] as const;
const ORDERS_PAGE_SIZE = 25;

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
  // Keep the first server render and browser hydration identical. Browser cache
  // is restored in an effect below, after React has hydrated the page.
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Luxury dynamic toast state
  const [arrivalToastOrder, setArrivalToastOrder] = useState<Order | null>(null);

  // Manual order modal state
  const [showCreate, setShowCreate] = useState(false);
  const [tables, setTables] = useState<{ id: string; label: string; section: string | null }[]>([]);
  const [menuItems, setMenuItems] = useState<{ id: string; name: string; priceCents: number; isVeg?: boolean; isAvailable?: boolean; category: MenuCategory }[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [pickerTarget, setPickerTarget] = useState<"edit" | "create" | null>(null);
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
  const [editingOrder, setEditingOrder] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLines, setEditLines] = useState<{ itemId: string; qty: number; name: string; price: number }[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const prevNewCount = useRef(-1);
  const orderStatusById = useRef(new Map<string, string>());
  const isFetching = useRef(false);
  const refreshQueued = useRef(false);
  const isLoadingMore = useRef(false);
  const currentPage = useRef(1);
  const currentQueryKey = useRef("all|");
  const tabRef = useRef(tab);
  const searchRef = useRef(search);
  tabRef.current = tab;
  searchRef.current = search;
  const handleSelectOrder = useCallback((order: OrderRowData) => setSelected(order as Order), []);

  // Serverless instances do not share memory. The shared Realtime stream
  // signals changes; fetch the order snapshot only at entry or after a signal.
  const load = useCallback(async (page = 1, append = false, preserveLoadedPages = true) => {
    if (isFetching.current || isLoadingMore.current) return;
    if (append) {
      isLoadingMore.current = true;
      setLoadingMore(true);
    } else {
      isFetching.current = true;
    }
    const status = tabRef.current === "All" ? "all" : tabRef.current.toLowerCase();
    const query = searchRef.current.trim();
    const queryKey = `${status}|${query}`;
    const params = new URLSearchParams({ page: String(page), limit: String(ORDERS_PAGE_SIZE), status, search: query });
    const url = `/api/admin/orders?${params.toString()}`;
    try {
      const data = await fetchJsonCached<{
        orders?: Order[];
        pagination?: { page: number; total: number; hasMore: boolean };
        statusCounts?: Record<string, number>;
      }>(`admin:${url}`, url);
      const latestStatus = tabRef.current === "All" ? "all" : tabRef.current.toLowerCase();
      if (queryKey !== `${latestStatus}|${searchRef.current.trim()}`) return;
      saveAdminRouteData(url, data);
      const list: Order[] = data.orders ?? [];
      for (const order of list) orderStatusById.current.set(order.id, order.status);
      const sameQuery = currentQueryKey.current === queryKey;
      if (append && sameQuery) {
        setOrders((current) => {
          const ids = new Set(current.map((order) => order.id));
          return [...current, ...list.filter((order) => !ids.has(order.id))];
        });
      } else if (!append && page === 1 && preserveLoadedPages && sameQuery) {
        const activeTab = tabRef.current;
        const normalizedSearch = searchRef.current.trim().toLowerCase().replace(/^#/, "");
        setOrders((current) => {
          const freshIds = new Set(list.map((order) => order.id));
          const stillMatches = (order: Order) => {
            const matchesStatus = activeTab === "All"
              || (activeTab === "New" && (order.status === "NEW" || order.status === "ACCEPTED"))
              || order.status === activeTab.toUpperCase();
            if (!matchesStatus) return false;
            if (!normalizedSearch) return true;
            return order.orderNumber.toString().includes(normalizedSearch)
              || Boolean(order.customerName?.toLowerCase().includes(normalizedSearch))
              || Boolean(order.customerPhone?.toLowerCase().includes(normalizedSearch))
              || Boolean(order.table?.label.toLowerCase().includes(normalizedSearch))
              || order.items.some((item) => item.nameSnapshot.toLowerCase().includes(normalizedSearch));
          };
          return [...list, ...current.filter((order) => !freshIds.has(order.id) && stillMatches(order))];
        });
      } else {
        setOrders(list);
      }
      currentQueryKey.current = queryKey;
      if (!(page === 1 && preserveLoadedPages && sameQuery)) currentPage.current = page;
      setHasMore(data.pagination?.hasMore ?? false);
      setTotalOrders(data.pagination?.total ?? list.length);
      setStatusCounts(data.statusCounts ?? {});
      setLoading(false);

      setSelected((prev) => {
        if (!prev) return prev;
        return list.find((o) => o.id === prev.id) ?? prev;
      });

      const newOrders = list.filter((o) => o.status === "NEW");
      if (prevNewCount.current !== -1 && newOrders.length > prevNewCount.current) {
        // AdminOrderNotifications owns the shared sound; this page owns its toast.
        const latestNewOrder = newOrders[0];
        setArrivalToastOrder(latestNewOrder);
      }
      prevNewCount.current = newOrders.length;
    } catch {
      // Keep the page usable with its last snapshot if the refresh fails.
      if (!append) setLoading(false);
    } finally {
      if (append) {
        isLoadingMore.current = false;
        setLoadingMore(false);
      } else {
        isFetching.current = false;
      }
      if (refreshQueued.current) {
        refreshQueued.current = false;
        invalidateCache("admin:/api/admin/orders");
        void load(1, false, true);
      }
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore.current) return;
    void load(currentPage.current + 1, true);
  }, [hasMore, load]);

  useEffect(() => {
    const cached = peekCache<{
      orders?: Order[];
      pagination?: { page: number; total: number; hasMore: boolean };
      statusCounts?: Record<string, number>;
    }>("admin:/api/admin/orders?page=1&limit=25&status=all&search=");
    if (!cached) return;
    setOrders(cached.orders ?? []);
    setHasMore(cached.pagination?.hasMore ?? false);
    setTotalOrders(cached.pagination?.total ?? cached.orders?.length ?? 0);
    setStatusCounts(cached.statusCounts ?? {});
    for (const order of cached.orders ?? []) orderStatusById.current.set(order.id, order.status);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Refresh the current query once; subsequent updates are push-driven.
    const delay = search.trim() ? 300 : 0;
    let timer = 0;
    let cancelled = false;
    const refresh = () => {
      if (cancelled) return;
      if (isFetching.current || isLoadingMore.current) {
        refreshQueued.current = true;
        return;
      }
      const requestedStatus = tabRef.current === "All" ? "all" : tabRef.current.toLowerCase();
      const requestedQueryKey = `${requestedStatus}|${searchRef.current.trim()}`;
      const queryChanged = currentQueryKey.current !== requestedQueryKey;
      if (queryChanged) setOrders([]);
      currentQueryKey.current = "";
      currentPage.current = 1;
      setOrders([]);
      setHasMore(true);
      setTotalOrders(0);
      setLoading(true);
      invalidateCache("admin:/api/admin/orders");
      void load(1, false, false);
    };
    timer = window.setTimeout(refresh, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tab, search, load]);

  useEffect(() => {
    const onRestaurantEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.type === "resync") {
        invalidateCache("admin:/api/admin/orders");
        if (isFetching.current || isLoadingMore.current) refreshQueued.current = true;
        else void load(1, false, true);
      } else if (detail?.type === "order_created") {
        invalidateCache("admin:/api/admin/orders");
        const data = detail.data?.order ?? detail.data ?? {};
        // The public event includes the full order so live updates do not need
        // to issue three list queries for every incoming ticket.
        if (!data.id || !Array.isArray(data.items)) {
          if (isFetching.current || isLoadingMore.current) refreshQueued.current = true;
          else void load(1, false, true);
          return;
        }
        const freshOrder = data as Order;
        const activeTab = tabRef.current;
        const normalizedSearch = searchRef.current.trim().toLowerCase().replace(/^#/, "");
        const matchesTab = activeTab === "All" || (activeTab === "New" && ["NEW", "ACCEPTED"].includes(freshOrder.status)) || freshOrder.status === activeTab.toUpperCase();
        const matchesSearch = !normalizedSearch || freshOrder.orderNumber.toString().includes(normalizedSearch)
          || Boolean(freshOrder.customerName?.toLowerCase().includes(normalizedSearch))
          || Boolean(freshOrder.customerPhone?.toLowerCase().includes(normalizedSearch))
          || Boolean(freshOrder.table?.label.toLowerCase().includes(normalizedSearch))
          || freshOrder.items.some((item) => item.nameSnapshot.toLowerCase().includes(normalizedSearch));
        if (matchesTab && matchesSearch) {
          const previousStatus = orderStatusById.current.get(freshOrder.id);
          orderStatusById.current.set(freshOrder.id, freshOrder.status);
          setOrders((current) => [freshOrder, ...current.filter((order) => order.id !== freshOrder.id)]);
          if (!previousStatus) {
            setTotalOrders((count) => count + 1);
            setStatusCounts((counts) => ({ ...counts, [freshOrder.status]: (counts[freshOrder.status] ?? 0) + 1 }));
          }
          if (freshOrder.status === "NEW") setArrivalToastOrder(freshOrder);
        }
      } else if (detail?.type === "order_updated") {
        invalidateCache("admin:/api/admin/orders");
        const update = detail.data ?? {};
        const previousStatus = orderStatusById.current.get(update.orderId);
        const found = Boolean(previousStatus);
        if (found && update.status && update.status !== previousStatus) {
          orderStatusById.current.set(update.orderId, update.status);
          setStatusCounts((counts) => ({
            ...counts,
            [previousStatus!]: Math.max(0, (counts[previousStatus!] ?? 0) - 1),
            [update.status]: (counts[update.status] ?? 0) + 1,
          }));
        }
        if (found) {
          const nextStatus = update.status ?? previousStatus;
          const activeTab = tabRef.current;
          const matchesTab = activeTab === "All" || (activeTab === "New" && ["NEW", "ACCEPTED"].includes(nextStatus)) || nextStatus === activeTab.toUpperCase();
          if (!matchesTab) {
            setOrders((current) => current.filter((order) => order.id !== update.orderId));
            setTotalOrders((count) => Math.max(0, count - 1));
          } else {
            setOrders((current) => current.map((order) => order.id !== update.orderId
              ? order
            : {
                ...order,
                ...(update.status ? { status: update.status } : {}),
                ...(update.totalCents !== undefined ? { totalCents: update.totalCents } : {}),
                ...(update.items ? { items: update.items } : {}),
                ...(update.item ? { items: order.items.map((item) => item.id === update.item.id ? { ...item, ...update.item } : item) } : {}),
              }));
          setSelected((current) => {
            if (!current || current.id !== update.orderId) return current;
            const items = update.items
              ? update.items as OrderItem[]
              : update.item
                ? current.items.map((item) => item.id === update.item.id ? { ...item, ...update.item } : item)
                : current.items;
            return {
              ...current,
              ...(update.status ? { status: update.status } : {}),
              ...(update.totalCents !== undefined ? { totalCents: update.totalCents } : {}),
              items,
            };
          });
          }
        }
        if (!found && (isFetching.current || isLoadingMore.current)) refreshQueued.current = true;
        else if (!found) void load(1, false, true);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const hiddenAt = Number(sessionStorage.getItem("inforyse:orders-hidden-at") ?? 0);
        sessionStorage.removeItem("inforyse:orders-hidden-at");
        if (hiddenAt && Date.now() - hiddenAt > 30_000) void load(1, false, true);
      } else sessionStorage.setItem("inforyse:orders-hidden-at", String(Date.now()));
    };
    window.addEventListener("inforyse:restaurant-event", onRestaurantEvent);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("inforyse:restaurant-event", onRestaurantEvent);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // CSS animates the progress bar without re-rendering every order row.
  useEffect(() => {
    if (!arrivalToastOrder) return;
    const timer = window.setTimeout(() => setArrivalToastOrder(null), 6000);
    return () => window.clearTimeout(timer);
  }, [arrivalToastOrder]);

  // Load tables + menu items when manual create modal opens
  useEffect(() => {
    if (!showCreate) return;
    Promise.all([
      fetch("/api/admin/tables").then((r) => r.json()),
      fetch("/api/admin/menu-items?page=1&limit=30").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ]).then(([t, m, c]) => {
      setTables(t.tables ?? []);
      setMenuItems(m.items ?? []);
      setCategories(c.categories ?? []);
    });
  }, [showCreate]);

  // Handle scroll pagination
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 180) loadMore();
  }

  const filtered = orders;
  const visibleOrders = orders;

  const tabCounts = useMemo(() => {
    return {
      All: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      New: (statusCounts.NEW ?? 0) + (statusCounts.ACCEPTED ?? 0),
      Preparing: statusCounts.PREPARING ?? 0,
      Ready: statusCounts.READY ?? 0,
      Completed: statusCounts.COMPLETED ?? 0,
      Cancelled: statusCounts.CANCELLED ?? 0,
    };
  }, [statusCounts]);

  const updateStatus = useCallback(async (order: Order, nextStatus: string) => {
    const key = order.id + nextStatus;
    setUpdatingId(key);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        await load();
        return;
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o))
      );
      setSelected((prev) =>
        prev?.id === order.id ? { ...prev, status: nextStatus } : prev
      );
      if (arrivalToastOrder?.id === order.id) {
        setArrivalToastOrder(null);
      }
      invalidateCache("admin:/api/admin/orders");
    } finally {
      setUpdatingId(null);
    }
  }, [arrivalToastOrder, load]);

  async function updateItemFulfillment(order: Order, item: OrderItem, kind: "served" | "cancelled", delta: number) {
    const servedQuantity = item.servedQuantity + (kind === "served" ? delta : 0);
    const cancelledQuantity = item.cancelledQuantity + (kind === "cancelled" ? delta : 0);
    if (servedQuantity < 0 || cancelledQuantity < 0 || servedQuantity + cancelledQuantity > item.quantity) return;
    setUpdatingId(item.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/items/${item.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servedQuantity, cancelledQuantity }),
      });
      const data = await response.json();
      if (!response.ok) { alert(data.error || "Could not update served quantity."); return; }
      await load();
    } finally { setUpdatingId(null); }
  }

  const printBill = useCallback((order: Order) => {
    const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]!);
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
  }, []);

  const handlePrintOrder = useCallback((order: OrderRowData) => printBill(order as Order), [printBill]);
  const handleUpdateOrderStatus = useCallback((order: OrderRowData, nextStatus: string) => updateStatus(order as Order, nextStatus), [updateStatus]);

  // Manual order helpers
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

  function beginEdit(order: Order) {
    setEditCustomerName(order.customerName ?? ""); setEditCustomerPhone(order.customerPhone ?? ""); setEditNotes(order.notes ?? "");
    setEditLines(order.items.flatMap((item) => item.menuItemId ? [{ itemId: item.menuItemId, qty: item.quantity, name: item.nameSnapshot, price: item.priceCentsSnapshot }] : []));
    setEditError(null); setEditingOrder(true); setPickerTarget("edit");
    Promise.all([fetch("/api/admin/menu-items?page=1&limit=30").then((r) => r.json()), fetch("/api/admin/categories").then((r) => r.json())]).then(([m, c]) => { setMenuItems(m.items ?? []); setCategories(c.categories ?? []); });
  }
  async function saveEdit() {
    if (!selected || editLines.length === 0) return setEditError("Add at least one menu item.");
    setUpdatingId(selected.id); setEditError(null);
    try {
      const response = await fetch(`/api/admin/orders/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: editCustomerName, customerPhone: editCustomerPhone, notes: editNotes, items: editLines.map((line) => ({ menuItemId: line.itemId, quantity: line.qty })) }) });
      const data = await response.json();
      if (!response.ok) return setEditError(data.error ?? "Could not update order.");
      setEditingOrder(false); invalidateCache("admin:/api/admin/orders"); await load();
    } finally { setUpdatingId(null); }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {arrivalToastOrder && <OrderArrivalToast order={arrivalToastOrder} onDismiss={() => setArrivalToastOrder(null)} onInspect={(order) => { setSelected(order as Order); setArrivalToastOrder(null); }} onAccept={(order) => { void updateStatus(order as Order, "ACCEPTED"); setArrivalToastOrder(null); }} />}

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
                onClick={() => { void load(1, false, true); }}
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
                  onChange={(e) => setSearch(e.target.value)}
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
                  {visibleOrders.map((order) => <AdminOrderTableRow key={order.id} order={order} meta={STATUS_META[order.status] ?? STATUS_META.NEW} nextAction={NEXT_STATUS[order.status]} selected={selected?.id === order.id} updating={updatingId !== null} onSelect={handleSelectOrder} onPrint={handlePrintOrder} onStatus={handleUpdateOrderStatus} />)}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── Modern KDS Cards View ────────────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {visibleOrders.map((order) => <AdminOrderCard key={order.id} order={order} meta={STATUS_META[order.status] ?? STATUS_META.NEW} nextAction={NEXT_STATUS[order.status]} selected={selected?.id === order.id} updating={updatingId !== null} onSelect={handleSelectOrder} onPrint={handlePrintOrder} onStatus={handleUpdateOrderStatus} />)}
            </div>
          )}

          {/* ── Scroll Pagination Feedback Indicator ────────────────────────── */}
          {filtered.length > 0 && (
            <div className="py-4 text-center">
              {loadingMore ? (
                <span className="text-xs font-semibold text-slate-500 inline-flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading more orders…</span>
              ) : hasMore ? (
                <span className="text-xs text-slate-400">Showing {visibleOrders.length} of {totalOrders} orders · Scroll for more</span>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Showing all {visibleOrders.length} matching orders</span>
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
              {!["COMPLETED", "CANCELLED"].includes(selected.status) && <button onClick={() => beginEdit(selected)} title="Edit order" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit Order</button>}
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

            {editingOrder ? (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs">
                <strong className="block text-slate-800">Edit customer and items</strong>
                <input className="input w-full" placeholder="Customer name" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} />
                <input className="input w-full" placeholder="Phone number" value={editCustomerPhone} onChange={(e) => setEditCustomerPhone(e.target.value)} />
                <textarea className="input w-full" placeholder="Kitchen notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                <button type="button" onClick={() => setPickerTarget("edit")} className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-left text-xs font-bold text-emerald-950">Browse categories, search dishes, or add a new menu dish</button>
                {editLines.map((line) => <div key={line.itemId} className="flex items-center justify-between"><span>{line.name}</span><div className="flex items-center gap-2"><button onClick={() => setEditLines((lines) => lines.flatMap((x) => x.itemId !== line.itemId ? [x] : x.qty <= 1 ? [] : [{ ...x, qty: x.qty - 1 }]))}>−</button><span>{line.qty}</span><button onClick={() => setEditLines((lines) => lines.map((x) => x.itemId === line.itemId ? { ...x, qty: x.qty + 1 } : x))}>+</button></div></div>)}
                {editError && <p className="text-rose-700">{editError}</p>}
                <div className="flex gap-2"><button onClick={() => setEditingOrder(false)} className="rounded-lg border bg-white px-3 py-2">Cancel</button><button onClick={() => void saveEdit()} disabled={updatingId !== null} className="rounded-lg bg-emerald-950 px-3 py-2 font-bold text-white disabled:opacity-50">Save order</button></div>
              </div>
            ) : null}

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
                    className="flex flex-col gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2"><span className="h-6 w-6 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs">{item.quantity}</span><span className="font-semibold text-slate-800">{item.nameSnapshot}</span></div>
                      <span className="font-bold text-slate-900 font-mono">{formatRupees(item.priceCentsSnapshot * item.quantity)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      <span>Served {item.servedQuantity}/{item.quantity}</span>
                      <button type="button" disabled={selected.status !== "READY" || updatingId === item.id || item.servedQuantity + item.cancelledQuantity >= item.quantity} onClick={() => void updateItemFulfillment(selected, item, "served", 1)} className="rounded-lg border px-2 py-1 disabled:opacity-40">+ Served</button>
                      <button type="button" disabled={selected.status !== "READY" || updatingId === item.id || item.servedQuantity === 0} onClick={() => void updateItemFulfillment(selected, item, "served", -1)} className="rounded-lg border px-2 py-1 disabled:opacity-40">− Served</button>
                      <span>Cancelled {item.cancelledQuantity}/{item.quantity}</span>
                      <button type="button" disabled={selected.status !== "READY" || updatingId === item.id || item.servedQuantity + item.cancelledQuantity >= item.quantity} onClick={() => void updateItemFulfillment(selected, item, "cancelled", 1)} className="rounded-lg border px-2 py-1 disabled:opacity-40">+ Cancelled</button>
                      <button type="button" disabled={selected.status !== "READY" || updatingId === item.id || item.cancelledQuantity === 0} onClick={() => void updateItemFulfillment(selected, item, "cancelled", -1)} className="rounded-lg border px-2 py-1 disabled:opacity-40">− Cancelled</button>
                    </div>
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
              <div><span className="font-bold text-slate-700 mb-2 block uppercase tracking-wider text-[10px]">Menu Items</span><button type="button" onClick={() => setPickerTarget("create")} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-left text-xs font-bold text-emerald-950">Browse categories, search dishes, or add a new menu dish</button></div>

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
      <OrderMenuPicker
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        items={menuItems}
        categories={categories}
        lines={pickerTarget === "edit" ? editLines : manualLines}
        onLinesChange={(lines: PickerLine[]) => pickerTarget === "edit" ? setEditLines(lines) : setManualLines(lines)}
        onDishCreated={(item) => setMenuItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)])}
        onCategoryCreated={(category) => setCategories((current) => current.some((existing) => existing.id === category.id) ? current : [...current, category])}
      />
    </div>
  );
}
