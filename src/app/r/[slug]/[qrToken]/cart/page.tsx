"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Sparkles, CheckCircle2, Clock, ChefHat, PartyPopper } from "lucide-react";
import {
  useCart,
  formatRupees,
  getStoredOrders,
  saveStoredOrders,
  clearStoredOrders,
  type StoredPastOrder,
} from "@/components/CartContext";
import { useLanguage } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";

interface TableSessionData {
  table: { id: string; label: string; status: string };
  session: {
    id: string;
    status: string;
    createdAt: string;
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
  const [pastOrders, setPastOrders]       = useState<StoredPastOrder[]>([]);
  const [isFetchingSession, setIsFetchingSession] = useState(false);
  const [note, setNote]                   = useState("");

  const base = `/r/${params.slug}/${params.qrToken}`;

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
          // No open session on server. If table status is AVAILABLE, wipe stale past orders
          if (data.table.status === "AVAILABLE") {
            clearStoredOrders(params.qrToken);
            setPastOrders([]);
          }
          syncSession(null, data.table.status);
        }
      }
    } catch {
      // Offline fallback: load from localStorage
      setPastOrders(getStoredOrders(params.qrToken));
    } finally {
      setIsFetchingSession(false);
    }
  }, [params.slug, params.qrToken, syncSession]);

  useEffect(() => {
    // Initial fetch on mount
    setPastOrders(getStoredOrders(params.qrToken));
    refreshTableOrders();
  }, [params.qrToken, refreshTableOrders]);

  // Refresh table orders when user views the confirmed tab
  useEffect(() => {
    if (tab === "confirmed") {
      refreshTableOrders();
    }
  }, [tab, refreshTableOrders]);

  const subtotal   = totalCents;
  const grandTotal = subtotal;

  // Running total calculation
  const liveTableTotal = sessionData?.session
    ? Math.max(0, sessionData.session.subtotalCents - (sessionData.session as any).discountCents || sessionData.session.subtotalCents)
    : pastOrders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.totalCents, 0);

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
                href={base}
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
                <Link href={base} className="text-xs text-emerald-700 font-bold hover:underline">
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
                href={base}
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
              >
                <span>+ Order More</span>
              </Link>
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">
              All dishes ordered by anyone at Table {tableLabel} are united into this single table bill. Settle at the counter when you finish dining.
            </p>
          </div>

          {confirmedCount === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-xs">
              <div className="text-6xl mb-3">🍽️</div>
              <h3 className="font-bold text-gray-900 text-base">No active orders yet</h3>
              <p className="text-gray-400 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
                When you or anyone at Table {tableLabel} places an order, it will appear here in real time!
              </p>
              <div className="mt-6 flex flex-col gap-2.5 max-w-xs mx-auto">
                <Link
                  href={base}
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
              <div className="space-y-2 pt-2">
                <Link
                  href={base}
                  className="flex items-center justify-center w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all shadow-sm"
                >
                  + Add more dishes to Table {tableLabel}
                </Link>

                <button
                  onClick={() => {
                    if (window.confirm("Clear completed orders for this table session from your screen?")) {
                      clearStoredOrders(params.qrToken);
                      setPastOrders([]);
                    }
                  }}
                  className="w-full text-center text-xs text-gray-400 hover:text-red-500 py-2 transition-colors"
                >
                  Clear my local cache for this table
                </button>
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
