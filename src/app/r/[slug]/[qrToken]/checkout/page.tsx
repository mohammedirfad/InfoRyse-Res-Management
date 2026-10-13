"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Shield } from "lucide-react";
import { useCart, formatRupees, getStoredOrders, saveStoredOrders } from "@/components/CartContext";

const TAX_RATE = 0.05;
const PACKING  = 2000;

type OrderType     = "DINE_IN" | "TAKEAWAY";
type PaymentMethod = "PAY_AT_RESTAURANT" | "UPI" | "CARD" | "WALLET";

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; desc: string; icon: string }[] = [
  { id: "PAY_AT_RESTAURANT", label: "Pay at Restaurant", desc: "Settle your bill at the counter", icon: "💵" },
  { id: "UPI",               label: "UPI Payment",       desc: "Pay using any UPI app",          icon: "📱" },
  { id: "CARD",              label: "Credit / Debit Card",desc: "Secure online payment",         icon: "💳" },
  { id: "WALLET",            label: "Wallets",            desc: "Pay using wallet balance",       icon: "👛" },
];

export default function CheckoutPage({ params }: { params: { slug: string; qrToken: string } }) {
  const { lines, totalCents, clear } = useCart();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const noteFromCart = searchParams.get("note") ?? "";
  const promoFromCart= searchParams.get("promo") ?? "";

  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [email, setEmail]       = useState("");
  const [note, setNote]         = useState(noteFromCart);
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [payment, setPayment]   = useState<PaymentMethod>("PAY_AT_RESTAURANT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; contact?: string }>({});
  const [idempotencyKey]        = useState(() => crypto.randomUUID());

  const subtotal   = totalCents;
  const tax        = Math.round(subtotal * TAX_RATE);
  const discount   = promoFromCart === "WELCOME10" ? Math.round(subtotal * 0.1) : 0;
  const grandTotal = subtotal + tax + PACKING - discount;

  function validate() {
    const errs: { name?: string; contact?: string } = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!phone.trim() && !email.trim()) {
      errs.contact = "Please enter your phone number or email";
    } else if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.replace(/\s/g, ""))) {
      errs.contact = "Enter a valid 10-digit Indian mobile number";
    } else if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.contact = "Enter a valid email address";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function placeOrder() {
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: params.slug,
          qrToken: params.qrToken,
          idempotencyKey,
          customerName: name,
          customerPhone: phone.trim() || undefined,
          customerEmail: email.trim() || undefined,
          notes: note || undefined,
          orderType,
          paymentMethod: payment,
          items: lines.map(l => ({ menuItemId: l.item.id, quantity: l.quantity })),
        }),
      });

      // Safe JSON parse — a 503 from the server might have no body
      let json: any = {};
      try { json = await res.json(); } catch { /* empty body is fine */ }

      if (!res.ok) { setError(json?.error || "Could not place order. Please try again."); setSubmitting(false); return; }

      // Save order to localStorage with session ID so cart page shows it during active meal
      const existing = getStoredOrders(params.qrToken, json.tableSessionId);
      existing.push({
        id:          json.order.id,
        orderNumber: json.order.orderNumber,
        status:      "NEW",
        totalCents:  grandTotal,
        createdAt:   new Date().toISOString(),
        items:       lines.map(l => ({
          nameSnapshot:       l.item.name,
          priceCentsSnapshot: l.item.priceCents,
          quantity:           l.quantity,
        })),
        sessionId:   json.tableSessionId,
      });
      saveStoredOrders(params.qrToken, existing, json.tableSessionId);

      // Clear only the current cart lines (NOT the past orders)
      // Call clear() AND explicitly remove from localStorage synchronously
      // before routing, so the cart page never shows stale items
      clear();
      // Belt-and-suspenders: also remove synchronously in case React batching
      // delays the clear() effect until after the navigation renders cart
      try {
        localStorage.removeItem(`inforyse_cart_${params.slug}_${params.qrToken}`);
      } catch { /* ignore */ }
      router.push(`/r/${params.slug}/${params.qrToken}/confirmation?orderNumber=${json.order.orderNumber}&name=${encodeURIComponent(name)}&total=${grandTotal}`);
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1]" style={{ paddingBottom: "8rem" }}>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#132A1E] to-[#1C3C29] text-white px-5 pt-9 pb-8 rounded-b-[2.5rem]">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-display">Almost There</h1>
            <p className="text-xs text-white/50">A few more steps to enjoy your meal</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* Order type */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Order Type</p>
          <div className="grid grid-cols-2 gap-3">
            {(["DINE_IN", "TAKEAWAY"] as const).map(t => (
              <button key={t} onClick={() => setOrderType(t)}
                className={`rounded-2xl p-4 border-2 text-left transition-all active:scale-[0.97]
                  ${orderType === t ? "border-[#132A1E] bg-[#132A1E]/5 shadow-sm" : "border-black/8 hover:border-[#132A1E]/20"}`}>
                <div className="text-2xl mb-1.5">{t === "DINE_IN" ? "🍽️" : "🛍️"}</div>
                <p className="font-bold text-sm text-gray-900">{t === "DINE_IN" ? "Dine In" : "Takeaway"}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t === "DINE_IN" ? "We'll serve it at your table" : "Pick up at the counter"}</p>
                {orderType === t && <p className="text-[10px] text-[#132A1E] font-bold mt-1">✓ Selected</p>}
              </button>
            ))}
          </div>
        </div>

        {/* Customer details */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 space-y-3">
          <p className="text-sm font-bold text-gray-700">Your Details</p>

          {/* Name */}
          <div>
            <input
              className={`input ${fieldErrors.name ? "border-red-400 ring-1 ring-red-400" : ""}`}
              placeholder="Your name *"
              value={name}
              onChange={e => { setName(e.target.value); setFieldErrors(f => ({ ...f, name: undefined })); }}
            />
            {fieldErrors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠️ {fieldErrors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <input
              className={`input ${fieldErrors.contact && !phone.trim() ? "border-red-400 ring-1 ring-red-400" : ""}`}
              placeholder="Phone number * (10 digits)"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={e => { setPhone(e.target.value); setFieldErrors(f => ({ ...f, contact: undefined })); }}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Email */}
          <div>
            <input
              className={`input ${fieldErrors.contact && !email.trim() ? "border-red-400 ring-1 ring-red-400" : ""}`}
              placeholder="Email address *"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, contact: undefined })); }}
            />
            {fieldErrors.contact && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠️ {fieldErrors.contact}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Either phone or email is required for order confirmation</p>
          </div>

          <textarea className="input resize-none" rows={2} value={note}
            placeholder="Special instructions (less spicy, no onions…)"
            onChange={e => setNote(e.target.value)} />
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Payment Method</p>
          <div className="space-y-2">
            {PAYMENT_OPTIONS.map(opt => (
              <label key={opt.id}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98]
                  ${payment === opt.id ? "border-[#132A1E] bg-[#132A1E]/5" : "border-black/8 hover:border-[#132A1E]/20"}`}>
                <input type="radio" name="payment" value={opt.id} checked={payment === opt.id}
                  onChange={() => setPayment(opt.id)} className="sr-only" />
                <span className="text-xl">{opt.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-400">{opt.desc}</p>
                </div>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${payment === opt.id ? "border-[#132A1E]" : "border-gray-200"}`}>
                  {payment === opt.id && <div className="h-2.5 w-2.5 rounded-full bg-[#132A1E]" />}
                </div>
              </label>
            ))}
          </div>
          {payment !== "PAY_AT_RESTAURANT" && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5 mt-2.5">
              ℹ️ Online payment coming soon. Please pay at the restaurant for now.
            </p>
          )}
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Order Summary</p>
          {lines.map(l => (
            <div key={l.item.id} className="flex justify-between text-sm py-1.5 text-gray-600">
              <span className="truncate pr-3">{l.item.name} × {l.quantity}</span>
              <span className="font-semibold flex-shrink-0">{formatRupees(l.item.priceCents * l.quantity)}</span>
            </div>
          ))}
          <div className="pt-2 mt-1 border-t border-black/5 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatRupees(subtotal)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Taxes (5%)</span><span>{formatRupees(tax)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Packing</span><span>{formatRupees(PACKING)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Promo (WELCOME10)</span><span>−{formatRupees(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-black/5">
              <span>Total</span><span>{formatRupees(grandTotal)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm p-4 font-medium">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-black/5 p-4 safe-pb">
        <button onClick={placeOrder} disabled={submitting || lines.length === 0}
          className="btn-primary w-full bg-[#132A1E] text-white justify-between px-5 py-4 text-base shadow-lg rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-all">
          <span className="font-semibold">{submitting ? "Placing Order…" : "Place Order"}</span>
          {!submitting && (
            <div className="flex items-center gap-2">
              <span className="font-bold">{formatRupees(grandTotal)}</span>
              <ChevronRight className="h-5 w-5" />
            </div>
          )}
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-2 flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" /> Your information is secure
        </p>
      </div>
    </div>
  );
}
