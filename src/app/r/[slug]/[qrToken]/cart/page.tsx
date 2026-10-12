"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCart, formatRupees } from "@/components/CartContext";

const TAX_RATE = 0.05;
const PACKING  = 2000;

type PastOrder = {
  id: string; orderNumber: number; status: string;
  totalCents: number; createdAt: string;
  items: { nameSnapshot: string; priceCentsSnapshot: number; quantity: number }[];
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW:       { label: "Waiting",   color: "text-orange-500" },
  ACCEPTED:  { label: "Accepted",  color: "text-amber-600"  },
  PREPARING: { label: "Preparing", color: "text-blue-600"   },
  READY:     { label: "Ready! 🎉", color: "text-purple-600" },
  COMPLETED: { label: "Served ✓",  color: "text-green-600"  },
  CANCELLED: { label: "Cancelled", color: "text-gray-400"   },
};

export default function CartPage({ params }: { params: { slug: string; qrToken: string } }) {
  const { lines, setQuantity, removeItem, totalCents } = useCart();
  const [tab, setTab]           = useState<"new" | "confirmed">("new");
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [note, setNote]         = useState("");
  const base = `/r/${params.slug}/${params.qrToken}`;

  useEffect(() => {
    const raw = localStorage.getItem(`inforyse_orders_${params.qrToken}`);
    if (raw) { try { setPastOrders(JSON.parse(raw)); } catch { /* ignore */ } }
  }, [params.qrToken]);

  const subtotal   = totalCents;
  const tax        = Math.round(subtotal * TAX_RATE);
  const grandTotal = subtotal + tax + PACKING;

  // Running table total across all confirmed orders
  const confirmedTotal = pastOrders
    .filter(o => o.status !== "CANCELLED")
    .reduce((s, o) => s + o.totalCents, 0);

  function fmt(d: string) {
    return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Link href={base} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className="font-bold text-gray-900 text-base">Your order</h1>
        </div>

        {/* Tabs — exactly like reference */}
        <div className="flex border-b border-gray-100">
          <button onClick={() => setTab("new")}
            className={`flex-1 py-3 text-sm font-semibold transition-all relative
              ${tab === "new" ? "text-gray-900" : "text-gray-400"}`}>
            Yet to order {lines.length > 0 && `(${lines.length})`}
            {tab === "new" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-full" />}
          </button>
          <button onClick={() => setTab("confirmed")}
            className={`flex-1 py-3 text-sm font-semibold transition-all relative
              ${tab === "confirmed" ? "text-gray-900" : "text-gray-400"}`}>
            Confirmed orders {pastOrders.length > 0 && `(${pastOrders.length})`}
            {tab === "confirmed" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-full" />}
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
              <Link href={base} className="mt-5 bg-gray-900 text-white px-8 py-3 rounded-2xl font-semibold text-sm active:scale-95 transition-all">
                Browse menu
              </Link>
            </div>
          ) : (
            <>
              <p className="px-4 py-3 text-sm text-gray-500 font-medium">
                {lines.length} item{lines.length > 1 ? "s" : ""} to order
              </p>

              {/* Cart items — reference style: minimal rows */}
              <div className="divide-y divide-gray-50">
                {lines.map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0 ${item.isVeg ? "border-green-600" : "border-red-600"}`}>
                        <div className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                        <button className="text-xs text-purple-600 font-medium mt-0.5">Edit</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Qty controls */}
                      <div className="flex items-center gap-2 border border-gray-200 rounded-full px-2 py-1">
                        <button onClick={() => setQuantity(item.id, quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center text-gray-600 font-bold text-base active:scale-90 transition-transform">
                          −
                        </button>
                        <span className="text-sm font-bold text-gray-900 w-4 text-center">{quantity}</span>
                        <button onClick={() => setQuantity(item.id, quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center text-gray-600 font-bold text-base active:scale-90 transition-transform">
                          +
                        </button>
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-12 text-right">
                        {formatRupees(item.priceCents * quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special instructions */}
              <div className="px-4 py-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Special Instructions</p>
                <textarea
                  className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-200 transition-shadow"
                  rows={2} placeholder="e.g. No onions, extra spicy…"
                  value={note} onChange={e => setNote(e.target.value)} />
              </div>

              {/* Bill summary */}
              <div className="px-4 py-4 bg-gray-50 mx-4 rounded-2xl mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatRupees(subtotal)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>Packing</span><span>{formatRupees(PACKING)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>Taxes (5%)</span><span>{formatRupees(tax)}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span><span>{formatRupees(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Fixed bottom CTA */}
          {lines.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 safe-pb">
              <Link href={`${base}/checkout?note=${encodeURIComponent(note)}`}
                className="flex items-center justify-center w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-all">
                Proceed to checkout · {formatRupees(grandTotal)}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRMED ORDERS tab ─────────────────────────────────────────────── */}
      {tab === "confirmed" && (
        <div className="pb-8">
          {pastOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              {/* Reference UI illustration — table */}
              <div className="text-7xl mb-4">🪑</div>
              <p className="font-bold text-gray-800 text-base">You have not placed an order yet!</p>
              <button onClick={() => {
                  const raw = localStorage.getItem(`inforyse_orders_${params.qrToken}`);
                  if (raw) { try { setPastOrders(JSON.parse(raw)); } catch { /* ignore */ } }
                }}
                className="mt-4 flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-semibold text-sm active:scale-95 transition-all">
                <RefreshCw className="h-4 w-4" /> Tap to refresh
              </button>
            </div>
          ) : (
            <>
              {pastOrders.map(o => {
                const meta = STATUS_LABELS[o.status] ?? STATUS_LABELS.NEW;
                return (
                  <div key={o.id} className="border-b border-gray-100 px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-gray-900 text-sm">Order #{o.orderNumber}</span>
                        <span className="text-xs text-gray-400 ml-2">{fmt(o.createdAt)}</span>
                      </div>
                      <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                    </div>
                    {o.items.map((i, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-sm border-2 border-orange-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                          </div>
                          <span className="text-sm text-gray-800 font-medium">{i.nameSnapshot}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1">
                            − {i.quantity} +
                          </span>
                          <span className="text-sm font-bold text-gray-900 w-12 text-right">
                            {formatRupees(i.priceCentsSnapshot * i.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 mt-1 border-t border-gray-100">
                      <span>Order total</span><span>{formatRupees(o.totalCents)}</span>
                    </div>
                  </div>
                );
              })}

              {/* Running total */}
              <div className="mx-4 mt-4 bg-gray-900 text-white rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold">Running Table Total</p>
                  <p className="text-white/60 text-xs mt-0.5">All confirmed orders</p>
                </div>
                <span className="text-xl font-extrabold">{formatRupees(confirmedTotal)}</span>
              </div>

              <div className="px-4 mt-3">
                <Link href={base}
                  className="flex items-center justify-center w-full border-2 border-gray-900 text-gray-900 py-3.5 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all">
                  + Add more items
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
