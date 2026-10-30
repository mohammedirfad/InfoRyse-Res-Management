"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Sparkles, CheckCircle2, Clock, ChefHat, PartyPopper, Download, Receipt } from "lucide-react";
import {
  useCart,
  formatRupees,
  saveStoredOrders,
  clearStoredOrders,
  type StoredPastOrder,
} from "@/components/CartContext";
import { useLanguage } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";

interface TableSessionData {
  table: { id: string; label: string; status: string };
  bill?: {
    id?: string; shareToken?: string | null;
    billNumber: number; tableLabel: string; customerName: string | null;
    subtotalCents: number; discountCents: number; discountPercent: number;
    discountName: string | null; taxCents: number; taxPercent: number; taxName: string;
    packingCents: number; totalCents: number; paymentMethod: string; paymentStatus: string;
    itemsJson: string; createdAt: string;
    restaurant: { name: string; contactPhone: string | null; contactEmail: string | null };
  } | null;
  session: {
    id: string;
    status: string;
    createdAt: string;
    billRequestedAt?: string | null;
    orderCount: number;
    orders: {
      id: string;
      orderNumber: number;
      customerName: string;
      status: string;
      createdAt: string;
      subtotalCents: number;
      items: { name: string; price: number; quantity: number }[];
    }[];
    aggregatedItems: {
      name: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }[];
    subtotalCents: number;
    taxCents: number;
    packingCents: number;
    totalCents: number;
  } | null;
}

function downloadBill(bill: NonNullable<TableSessionData["bill"]>) {
  const win = window.open("", "_blank", "width=520,height=760");
  if (!win) return;
  const esc = (value: unknown) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]!));
  let items: { name: string; quantity: number; unitPrice: number; subtotal: number }[] = [];
  try { items = JSON.parse(bill.itemsJson); } catch { items = []; }
  const money = (cents: number) => `₹${(cents / 100).toFixed(2)}`;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bill #${bill.billNumber}</title><style>
    *{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#17251d;max-width:620px;margin:32px auto;padding:28px;background:#fff;border:1px solid #e5e7eb}
    header{text-align:center;border-bottom:1px dashed #9ca3af;padding-bottom:18px}h1{font-size:24px;margin:0 0 8px}header p{margin:4px;color:#58645d}.meta{display:flex;justify-content:space-between;margin:18px 0;color:#374151}
    table{width:100%;border-collapse:collapse}th,td{padding:10px 4px;border-bottom:1px solid #e5e7eb;text-align:right}th:first-child,td:first-child{text-align:left}tfoot td{border:0;padding:6px 4px}.total td{border-top:2px solid #17251d;font-size:18px;font-weight:bold;padding-top:12px}
    .discount{color:#047857}.foot{text-align:center;color:#6b7280;border-top:1px dashed #9ca3af;margin-top:20px;padding-top:14px;font-size:12px}
    @media print{body{margin:0 auto;border:0;padding:18px}}
  </style></head><body><header><h1>${esc(bill.restaurant.name)}</h1>${bill.restaurant.contactPhone ? `<p>${esc(bill.restaurant.contactPhone)}</p>` : ""}${bill.restaurant.contactEmail ? `<p>${esc(bill.restaurant.contactEmail)}</p>` : ""}<p>TABLE ${esc(bill.tableLabel)}</p></header>
    <div class="meta"><span><b>Bill #${bill.billNumber}</b><br>${new Date(bill.createdAt).toLocaleString("en-IN")}</span><span>${esc(bill.paymentStatus)} · ${esc(bill.paymentMethod)}</span></div>
    <table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${items.map((item) => `<tr><td>${esc(item.name)}</td><td>${item.quantity}</td><td>${money(item.unitPrice)}</td><td>${money(item.subtotal)}</td></tr>`).join("")}</tbody><tfoot>
    <tr><td colspan="3">Subtotal</td><td>${money(bill.subtotalCents)}</td></tr>${bill.discountCents > 0 ? `<tr class="discount"><td colspan="3">${esc(bill.discountName || "Discount")} (${bill.discountPercent}%)</td><td>−${money(bill.discountCents)}</td></tr>` : ""}
    <tr><td colspan="3">${esc(bill.taxName)} (${bill.taxPercent}%)</td><td>${money(bill.taxCents)}</td></tr>${bill.packingCents ? `<tr><td colspan="3">Packing / service</td><td>${money(bill.packingCents)}</td></tr>` : ""}<tr class="total"><td colspan="3">Grand total</td><td>${money(bill.totalCents)}</td></tr></tfoot></table><div class="foot">Thank you for dining with ${esc(bill.restaurant.name)}.</div>
    <script>window.onload=()=>window.print()</script></body></html>`);
  win.document.close();
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  NEW:       { label: "Waiting for Kitchen", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  icon: Clock },
  ACCEPTED:  { label: "Accepted",           color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   icon: Clock },
  PREPARING: { label: "Cooking in Kitchen",  color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: ChefHat },
  READY:     { label: "Ready to Serve! 🎉",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: PartyPopper },
  COMPLETED: { label: "Served ✓",           color: "text-zinc-700",   bg: "bg-zinc-100 border-zinc-200",   icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled",          color: "text-red-500",    bg: "bg-red-50 border-red-200",     icon: Clock },
};

function CartPageContent({ params }: { params: { slug: string; qrToken: string } }) {
  const { lines, setQuantity, removeItem, totalCents, syncSession } = useCart();
  const { t, tDish } = useLanguage();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "confirmed" ? "confirmed" : "new";

  const [tab, setTab]                     = useState<"new" | "confirmed">(initialTab);
  const [viewMode, setViewMode]           = useState<"rounds" | "aggregated">("rounds");
  const [sessionData, setSessionData]     = useState<TableSessionData | null>(null);
  const [lastDigitalBill, setLastDigitalBill] = useState<{ token: string; sessionId: string } | null>(null);
  const [pastOrders, setPastOrders]       = useState<StoredPastOrder[]>([]);
  const [isFetchingSession, setIsFetchingSession] = useState(false);
  const [note, setNote]                   = useState("");

  const base = `/r/${params.slug}/${params.qrToken}`;
  const billStorageKey = `digital-bill:${params.qrToken}`;

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(billStorageKey);
      if (saved) setLastDigitalBill(JSON.parse(saved));
    } catch { /* Ignore stale or malformed browser state. */ }
  }, [billStorageKey]);

  // Poll server for active TableSession (all orders placed by anyone at this table)
  const refreshTableOrders = useCallback(async () => {
    setIsFetchingSession(true);
    try {
      const res = await fetch(
        `/api/public/table-orders?slug=${encodeURIComponent(params.slug)}&qrToken=${encodeURIComponent(params.qrToken)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data: TableSessionData = await res.json();
        setSessionData(data);

        if (data.session?.id) {
          // A new table session invalidates the previous guest's bill link on this device.
          const previous = sessionStorage.getItem(billStorageKey);
          const parsed = previous ? JSON.parse(previous) as { token?: string; sessionId?: string } : null;
          if (parsed?.sessionId && parsed.sessionId !== data.session.id) {
            sessionStorage.removeItem(billStorageKey);
            setLastDigitalBill(null);
          }
          if (data.bill?.shareToken) {
            const savedBill = { token: data.bill.shareToken, sessionId: data.session.id };
            sessionStorage.setItem(billStorageKey, JSON.stringify(savedBill));
            setLastDigitalBill(savedBill);
          }
        }

        if (data.session && data.session.orders.length > 0) {
          // Convert server orders to StoredPastOrder format
          const mapped: StoredPastOrder[] = data.session.orders.map((o) => ({
            id:          o.id,
            orderNumber: o.orderNumber,
            status:      o.status,
            totalCents:  o.subtotalCents,
            createdAt:   o.createdAt,
            sessionId:   data.session?.id,
            items:       o.items.map((i) => ({
              nameSnapshot:       i.name,
              priceCentsSnapshot: i.price,
              quantity:           i.quantity,
            })),
          }));
          setPastOrders(mapped);
          saveStoredOrders(params.qrToken, mapped, data.session.id);
          syncSession(data.session.id, data.table.status);
        } else if (data.session === null) {
          // Server session is authoritative; never show stale browser-cached rounds.
          clearStoredOrders(params.qrToken);
          setPastOrders([]);
          syncSession(null, data.table.status);
          const saved = sessionStorage.getItem(billStorageKey);
          if (saved) {
            try { setLastDigitalBill(JSON.parse(saved)); } catch { sessionStorage.removeItem(billStorageKey); }
          }
        }
      }
    } catch {
      // Never substitute a possibly stale previous session for the live bill.
      setPastOrders([]);
    } finally {
      setIsFetchingSession(false);
    }
  }, [params.slug, params.qrToken, syncSession, billStorageKey]);

  useEffect(() => {
    // Initial fetch on mount
    refreshTableOrders();
  }, [params.qrToken, refreshTableOrders]);

  // Refresh table orders when user views the confirmed tab
  useEffect(() => {
    if (tab === "confirmed") {
      refreshTableOrders();
    }
  }, [tab, refreshTableOrders]);

  useEffect(() => {
    if (tab !== "confirmed") return;
    const url = `/api/public/order-events?slug=${encodeURIComponent(params.slug)}&qrToken=${encodeURIComponent(params.qrToken)}`;
    const source = new EventSource(url);
    const onTableChange = (rawEvent: MessageEvent) => {
      try {
        const event = JSON.parse(rawEvent.data);
        const shareToken = event?.data?.shareToken;
        const sessionId = event?.data?.sessionId;
        if (event?.type === "bill_updated" && shareToken && sessionId) {
          const billLink = { token: shareToken as string, sessionId: sessionId as string };
          sessionStorage.setItem(billStorageKey, JSON.stringify(billLink));
          setLastDigitalBill(billLink);
        }
      } catch { /* The session snapshot will still refresh when possible. */ }
      void refreshTableOrders();
    };
    let connectedBefore = false;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    source.addEventListener("connected", () => {
      if (fallbackTimer) clearInterval(fallbackTimer);
      fallbackTimer = null;
      if (connectedBefore) void refreshTableOrders();
      connectedBefore = true;
    });
    source.onerror = () => {
      if (!fallbackTimer) {
        void refreshTableOrders();
        fallbackTimer = setInterval(() => {
          if (document.visibilityState === "visible") void refreshTableOrders();
      }, 10000);
      }
    };
    source.addEventListener("realtime_unavailable", () => source.onerror?.(new Event("error")));
    source.addEventListener("restaurant_event", onTableChange);
    const onVisible = () => { if (document.visibilityState === "visible") void refreshTableOrders(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      source.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tab, params.slug, params.qrToken, refreshTableOrders]);

  const subtotal   = totalCents;
  const grandTotal = subtotal;

  // Running total calculation
  const liveTableTotal = sessionData?.session
    ? Math.max(0, sessionData.session.subtotalCents - (sessionData.session as any).discountCents || sessionData.session.subtotalCents)
    : 0;

  function fmtTime(d: string) {
    try {
      return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  const tableLabel = sessionData?.table?.label ?? "Your Table";
  const confirmedCount = sessionData?.session?.orders.length ?? pastOrders.length;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Link href={base} className="p-1.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Link>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">{t("orderAndTableTab", "Order & Table Tab")}</h1>
              <p className="text-[11px] font-semibold text-emerald-700">{t("table", "Table")} {tableLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector variant="compact" />
            {tab === "confirmed" && (
              <button
                onClick={refreshTableOrders}
                disabled={isFetchingSession}
                aria-label="Refresh orders"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold active:scale-95 transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetchingSession ? "animate-spin text-emerald-600" : ""}`} />
                <span>{isFetchingSession ? "…" : "Live"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab("new")}
            className={`flex-1 py-3 text-sm font-semibold transition-all relative ${
              tab === "new" ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t("newOrder", "Current Cart")} {lines.length > 0 && `(${lines.length})`}
            {tab === "new" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />}
          </button>
          <button
            onClick={() => setTab("confirmed")}
            className={`flex-1 py-3 text-sm font-semibold transition-all relative ${
              tab === "confirmed" ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t("confirmedOrders", "Table Bill & Tab")} {confirmedCount > 0 && `(${confirmedCount})`}
            {tab === "confirmed" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />}
          </button>
        </div>
      </div>

      {/* ── YET TO ORDER tab ────────────────────────────────────────────────── */}
      {tab === "new" && (
        <div style={{ paddingBottom: lines.length > 0 ? "8rem" : "2rem" }}>
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="font-bold text-gray-800 text-lg">Nothing added yet</h3>
              <p className="text-gray-400 text-sm mt-1.5">Go back to the menu and add your favourite dishes</p>
              <Link
                href={`${base}?view=menu`}
                className="mt-5 bg-gray-900 text-white px-8 py-3 rounded-2xl font-semibold text-sm active:scale-95 transition-all shadow-md"
              >
                Browse menu
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  {lines.length} item{lines.length > 1 ? "s" : ""} in your cart
                </p>
                <Link href={`${base}?view=menu`} className="text-xs text-emerald-700 font-bold hover:underline">
                  + Add more
                </Link>
              </div>

              {/* Cart items */}
              <div className="divide-y divide-gray-100 bg-white border-y border-gray-100">
                {lines.map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0 ${
                          item.isVeg ? "border-green-600" : "border-red-600"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{tDish(item.name)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatRupees(item.priceCents)} each</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Qty controls */}
                      <div className="flex items-center gap-2 border border-gray-200 rounded-full px-2 py-1 bg-gray-50/60">
                        <button
                          onClick={() => setQuantity(item.id, quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center text-gray-600 font-bold text-base active:scale-90 transition-transform"
                        >
                          −
                        </button>
                        <span className="text-sm font-bold text-gray-900 w-4 text-center">{quantity}</span>
                        <button
                          onClick={() => setQuantity(item.id, quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center text-gray-600 font-bold text-base active:scale-90 transition-transform"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-14 text-right">
                        {formatRupees(item.priceCents * quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special instructions */}
              <div className="px-4 py-4 bg-white mt-3 border-y border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Special Instructions</p>
                <textarea
                  className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 transition-shadow"
                  rows={2}
                  placeholder="e.g. Less spicy, no onions, extra cutlery…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {/* Bill summary */}
              <div className="px-4 py-4 bg-white mt-3 border-y border-gray-100">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>{t("subtotal", "Subtotal")}</span>
                    <span className="font-semibold text-gray-800">{formatRupees(subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 text-base">
                    <span>{t("totalForOrder", "Total for this order")}</span>
                    <span className="text-emerald-700">{formatRupees(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Fixed bottom CTA */}
          {lines.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 safe-pb z-30 shadow-lg">
              <Link
                href={`${base}/checkout?note=${encodeURIComponent(note)}`}
                className="flex items-center justify-between w-full bg-gray-900 text-white px-6 py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-all shadow-md"
              >
                <span>{t("proceedToCheckout", "Proceed to checkout")}</span>
                <span className="bg-white/20 px-3 py-1 rounded-xl text-sm font-semibold">{formatRupees(grandTotal)}</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRMED TABLE ORDERS tab ─────────────────────────────────────────────── */}
      {tab === "confirmed" && (
        <div className="pb-16 px-4 pt-4 space-y-4">
          {/* Table Banner */}
          <div className="bg-gradient-to-r from-gray-900 to-zinc-900 text-white rounded-3xl p-5 shadow-sm border border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                  Table {tableLabel} · Live Running Tab
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">
                  {confirmedCount} {confirmedCount === 1 ? "round" : "rounds"}
                </span>
                <button
                  type="button"
                  onClick={() => refreshTableOrders()}
                  disabled={isFetchingSession}
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  title="Refresh tab"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingSession ? "animate-spin text-emerald-400" : ""}`} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400 font-medium">Running Total Bill</p>
                <p className="text-2xl font-black text-white mt-0.5 tracking-tight">
                  {formatRupees(liveTableTotal)}
                </p>
              </div>
              <Link
                href={`${base}?view=menu`}
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
              >
                <span>+ Order More</span>
              </Link>
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">
              All dishes ordered by anyone at Table {tableLabel} are united into this single table bill. Settle at the counter when you finish dining.
            </p>
          </div>

          {sessionData?.session?.billRequestedAt && !sessionData.bill && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-bold">Bill requested</p>
              <p className="mt-1 text-xs">A staff member is preparing your final bill. It will appear here when ready.</p>
            </div>
          )}

          {sessionData?.bill && (
            <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-4 bg-emerald-950 px-5 py-4 text-white">
                <div className="flex items-center gap-3"><Receipt className="h-5 w-5 text-emerald-300" /><div><p className="font-bold">Your final bill</p><p className="text-xs text-emerald-100/75">Bill #{sessionData.bill.billNumber} · Table {sessionData.bill.tableLabel}</p></div></div>
                {sessionData.bill.shareToken ? <Link href={`/bill/${sessionData.bill.shareToken}`} target="_blank" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-50"><Download className="h-4 w-4" /> View / Download</Link> : <button onClick={() => downloadBill(sessionData.bill!)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-50"><Download className="h-4 w-4" /> Download</button>}
              </div>
              <div className="space-y-2 p-5">
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-gray-100 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400"><span>Items</span><span>Qty</span><span>Amount</span></div>
                {(() => { try { return JSON.parse(sessionData.bill.itemsJson).map((item: {name:string;quantity:number;subtotal:number}, idx:number) => <div key={`${item.name}-${idx}`} className="grid grid-cols-[1fr_auto_auto] gap-3 py-1 text-sm"><span className="font-medium text-gray-800">{tDish(item.name)}</span><span className="text-gray-500">{item.quantity}</span><span className="font-semibold text-gray-900">{formatRupees(item.subtotal)}</span></div>); } catch { return <p className="text-sm text-gray-500">Bill items unavailable.</p>; } })()}
                <div className="space-y-2 border-t border-dashed border-gray-200 pt-3 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatRupees(sessionData.bill.subtotalCents)}</span></div>
                  {sessionData.bill.discountCents > 0 && <div className="flex justify-between font-semibold text-emerald-700"><span>{sessionData.bill.discountName || "Discount"} ({sessionData.bill.discountPercent}%)</span><span>−{formatRupees(sessionData.bill.discountCents)}</span></div>}
                  <div className="flex justify-between text-gray-600"><span>{sessionData.bill.taxName} ({sessionData.bill.taxPercent}%)</span><span>{formatRupees(sessionData.bill.taxCents)}</span></div>
                  {sessionData.bill.packingCents > 0 && <div className="flex justify-between text-gray-600"><span>Packing / service</span><span>{formatRupees(sessionData.bill.packingCents)}</span></div>}
                  <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-black text-gray-950"><span>Grand total</span><span>{formatRupees(sessionData.bill.totalCents)}</span></div>
                  <p className="text-right text-xs text-gray-400">{sessionData.bill.paymentStatus} · {sessionData.bill.paymentMethod}</p>
                  {sessionData.bill.paymentStatus !== "PAID" && <p className="text-right text-xs font-semibold text-amber-700">Please settle with staff to close this bill.</p>}
                </div>
              </div>
            </section>
          )}

          {!sessionData?.session && lastDigitalBill?.token && (
            <section className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div><p className="font-bold text-emerald-950">Your digital bill is ready</p><p className="mt-1 text-xs text-emerald-800">View, download, or share your bill.</p></div>
              <Link href={`/bill/${lastDigitalBill.token}`} target="_blank" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-950 px-3 py-2 text-xs font-bold text-white"><Download className="h-4 w-4" /> View bill</Link>
            </section>
          )}

          {confirmedCount === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-xs">
              <div className="text-6xl mb-3">🍽️</div>
              <h3 className="font-bold text-gray-900 text-base">No active orders yet</h3>
              <p className="text-gray-400 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
                When you or anyone at Table {tableLabel} places an order, it will appear here in real time!
              </p>
              <div className="mt-6 flex flex-col gap-2.5 max-w-xs mx-auto">
                <Link
                  href={`${base}?view=menu`}
                  className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-sm"
                >
                  Browse Menu & Order
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* View mode toggle */}
              <div className="flex bg-gray-100/90 p-1 rounded-2xl border border-gray-200/60">
                <button
                  onClick={() => setViewMode("rounds")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    viewMode === "rounds"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  By Order Rounds ({confirmedCount})
                </button>
                <button
                  onClick={() => setViewMode("aggregated")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    viewMode === "aggregated"
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Consolidated Items Bill
                </button>
              </div>

              {/* View 1: Rounds */}
              {viewMode === "rounds" && (
                <div className="space-y-3">
                  {(sessionData?.session?.orders ?? pastOrders).map((order: any, idx: number) => {
                    const statusMeta = STATUS_LABELS[order.status] ?? STATUS_LABELS.NEW;
                    const StatusIcon = statusMeta.icon;
                    const customer = order.customerName || "Table Guest";
                    const orderNum = order.orderNumber ?? idx + 1;

                    return (
                      <div
                        key={order.id || idx}
                        className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-900 text-sm">
                                Round {idx + 1} · #{orderNum}
                              </span>
                              <span className="text-[11px] text-gray-400 font-medium">
                                {fmtTime(order.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">Ordered by: {customer}</p>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.bg} ${statusMeta.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusMeta.label}
                          </span>
                        </div>

                        {/* Items in this round */}
                        <div className="divide-y divide-gray-50 border-t border-gray-50 pt-2">
                          {order.items.map((i: any, iIdx: number) => {
                            const name = i.nameSnapshot ?? i.name;
                            const price = i.priceCentsSnapshot ?? i.price ?? 0;
                            return (
                              <div key={iIdx} className="flex items-center justify-between py-1.5 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-gray-900 w-5">{i.quantity}×</span>
                                  <span className="text-gray-800 font-medium truncate">{tDish(name)}</span>
                                </div>
                                <span className="font-bold text-gray-900 text-right ml-2">
                                  {formatRupees(price * i.quantity)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs font-bold text-gray-900">
                          <span className="text-gray-500">Round subtotal</span>
                          <span>{formatRupees(order.subtotalCents ?? order.totalCents)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View 2: Consolidated Table Bill */}
              {viewMode === "aggregated" && (
                <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-gray-900 text-sm">Combined Dishes</h3>
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      All Rounds Unified
                    </span>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {(sessionData?.session?.aggregatedItems ?? []).length > 0 ? (
                      sessionData!.session!.aggregatedItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-gray-900 w-5">{item.quantity}×</span>
                            <span className="text-gray-800 font-medium truncate">{tDish(item.name)}</span>
                          </div>
                          <span className="font-bold text-gray-900 text-right ml-2">
                            {formatRupees(item.subtotal)}
                          </span>
                        </div>
                      ))
                    ) : (
                      // Fallback: aggregate from pastOrders if server data pending
                      <p className="text-xs text-gray-400 py-3 text-center">Loading combined items…</p>
                    )}
                  </div>

                  {sessionData?.session && (
                    <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>{t("subtotal", "Items Subtotal")}</span>
                        <span className="font-semibold text-gray-900">{formatRupees(sessionData.session.subtotalCents)}</span>
                      </div>
                      {(sessionData.session as any).discountCents > 0 && (
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>{(sessionData.session as any).discountName || t("discount", "Discount")}</span>
                          <span>−{formatRupees((sessionData.session as any).discountCents)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-gray-900 text-sm pt-2 border-t border-gray-100">
                        <span>{t("runningTotalBill", "Running Table Bill")}</span>
                        <span className="text-emerald-700">{formatRupees(liveTableTotal)}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 text-center pt-1">
                        Official GST invoice printed upon settling at the counter.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2">
                <Link
                  href={`${base}?view=menu`}
                  className="flex items-center justify-center w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all shadow-sm"
                >
                  + Add more dishes to Table {tableLabel}
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CartPage({ params }: { params: { slug: string; qrToken: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CartPageContent params={params} />
    </Suspense>
  );
}
