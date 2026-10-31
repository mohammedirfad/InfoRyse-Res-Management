"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Shield } from "lucide-react";
import { useCart, formatRupees, getStoredOrders, saveStoredOrders } from "@/components/CartContext";
import { useLanguage } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { saveGuestTableSession } from "@/lib/guestTableSession";
import { capitalizeInitials } from "@/lib/nameFormat";

type OrderType     = "DINE_IN" | "TAKEAWAY";
type PaymentMethod = "PAY_AT_RESTAURANT" | "UPI" | "CARD" | "WALLET";

export default function CheckoutPage({ params }: { params: { slug: string; qrToken: string } }) {
  const { lines, totalCents, clear } = useCart();
  const { t, tDish } = useLanguage();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const noteFromCart = searchParams.get("note") ?? "";

  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [email, setEmail]       = useState("");
  const [note, setNote]         = useState(noteFromCart);
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [payment, setPayment]   = useState<PaymentMethod>("PAY_AT_RESTAURANT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});
  const [idempotencyKey]        = useState(() => crypto.randomUUID());

  const [restaurantDiscount, setRestaurantDiscount] = useState<{
    active: boolean;
    percent: number;
    name: string;
  }>({ active: false, percent: 0, name: "" });

  useEffect(() => {
    const cacheKey = `menu_${params.slug}_${params.qrToken}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.restaurant?.discountActive && (data.restaurant?.discountPercent ?? 0) > 0) {
          setRestaurantDiscount({
            active: true,
            percent: data.restaurant.discountPercent,
            name: data.restaurant.discountName || "Special Offer",
          });
        }
      }
    } catch { /* The server remains the source of truth for final pricing. */ }
  }, [params.slug, params.qrToken]);

  // Clean customer billing without hidden taxes/CGST at checkout (taxes only apply on final bill)
  const subtotal   = totalCents;
  const discount   = restaurantDiscount.active
    ? Math.round(subtotal * (restaurantDiscount.percent / 100))
    : 0;
  const grandTotal = Math.max(0, subtotal - discount);

  function validate() {
    const errs: { name?: string; phone?: string; email?: string } = {};
    if (!name.trim()) errs.name = "Name is required";

    const cleanPhone = phone.replace(/\D/g, "");
    const trimmedEmail = email.trim();

    if (!cleanPhone && !trimmedEmail) {
      errs.phone = "Enter your 10-digit mobile number or email";
    } else {
      if (cleanPhone) {
        if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
          errs.phone = "Enter a valid 10-digit Indian mobile number";
        }
      }
      if (trimmedEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          errs.email = "Enter a valid email address";
        }
      }
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
          customerName: capitalizeInitials(name),
          customerPhone: phone.trim() || undefined,
          customerEmail: email.trim() || undefined,
          notes: note || undefined,
          orderType,
          paymentMethod: payment,
          items: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })),
        }),
      });

      let json: any = {};
      try { json = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        setError(json?.error || "Could not place order. Please try again.");
        setSubmitting(false);
        return;
      }

      // Save order to localStorage with session ID so cart page shows it during active meal
      if (json.tableSessionId) saveGuestTableSession(params.qrToken, json.tableSessionId);
      const existing = getStoredOrders(params.qrToken, json.tableSessionId);
      existing.push({
        id:          json.order.id,
        orderNumber: json.order.orderNumber,
        status:      "NEW",
        totalCents:  grandTotal,
        createdAt:   new Date().toISOString(),
        items:       lines.map((l) => ({
          nameSnapshot:       l.item.name,
          priceCentsSnapshot: l.item.priceCents,
          quantity:           l.quantity,
        })),
        sessionId:   json.tableSessionId,
      });
      saveStoredOrders(params.qrToken, existing, json.tableSessionId);

      clear();
      try {
        localStorage.removeItem(`inforyse_cart_${params.slug}_${params.qrToken}`);
      } catch { /* ignore */ }

      const confirmedName = capitalizeInitials(json.order.customerName || name);
      const confirmedTotal = Number.isFinite(json.order.totalCents) ? json.order.totalCents : grandTotal;
      router.push(`/r/${params.slug}/${params.qrToken}/confirmation?orderNumber=${json.order.orderNumber}&name=${encodeURIComponent(confirmedName)}&total=${confirmedTotal}`);
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1]" style={{ paddingBottom: "8rem" }}>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#132A1E] to-[#1C3C29] text-white px-5 pt-8 pb-7 rounded-b-[2.5rem] shadow-md">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <LanguageSelector variant="pill" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{t("proceedToCheckout", "Almost There")}</h1>
          <p className="text-xs text-white/60 mt-0.5">Contactless, fast table order</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3.5 max-w-lg mx-auto">

        {/* Order type */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-xs p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Order Type</p>
          <div className="grid grid-cols-2 gap-3">
            {(["DINE_IN", "TAKEAWAY"] as const).map((ot) => (
              <button
                key={ot}
                onClick={() => setOrderType(ot)}
                className={`rounded-2xl p-4 border-2 text-left transition-all active:scale-[0.97] ${
                  orderType === ot
                    ? "border-[#132A1E] bg-[#132A1E]/5 shadow-xs"
                    : "border-black/8 hover:border-[#132A1E]/20"
                }`}
              >
                <div className="text-2xl mb-1.5">{ot === "DINE_IN" ? "🍽️" : "🛍️"}</div>
                <p className="font-bold text-sm text-gray-900">
                  {ot === "DINE_IN" ? t("dineIn", "Dine In") : "Takeaway"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ot === "DINE_IN" ? "Served at your table" : "Pick up at counter"}
                </p>
                {orderType === ot && (
                  <p className="text-[10px] text-[#132A1E] font-extrabold mt-1">✓ Selected</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Customer details */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-xs p-4 space-y-3">
          <p className="text-sm font-bold text-gray-700">{t("contactDetails", "Your Details")}</p>

          {/* Name */}
          <div>
            <input
              className={`w-full bg-gray-50 rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-700 ${
                fieldErrors.name ? "border-red-400 ring-1 ring-red-400" : "border-gray-200"
              }`}
              placeholder={t("yourName", "Your name *")}
              autoCapitalize="words"
              value={name}
              onChange={(e) => {
                setName(capitalizeInitials(e.target.value));
                setFieldErrors((f) => ({ ...f, name: undefined }));
              }}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠️ {fieldErrors.name}</p>
            )}
          </div>


          {/* Phone */}
          <div>
            <input
              className={`w-full bg-gray-50 rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-700 ${
                fieldErrors.phone ? "border-red-400 ring-1 ring-red-400" : "border-gray-200"
              }`}
              placeholder={t("mobileNumber", "Phone number (optional if email is provided)")}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(digits);
                setFieldErrors((f) => ({ ...f, phone: undefined }));
              }}
            />
            {fieldErrors.phone && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠️ {fieldErrors.phone}</p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Email */}
          <div>
            <input
              className={`w-full bg-gray-50 rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-700 ${
                fieldErrors.email ? "border-red-400 ring-1 ring-red-400" : "border-gray-200"
              }`}
              placeholder={t("emailAddress", "Email address")}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((f) => ({ ...f, email: undefined }));
              }}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠️ {fieldErrors.email}</p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">Phone or email is required for live order status</p>
          </div>

          <textarea
            className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs border border-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-700"
            rows={2}
            value={note}
            placeholder={t("specialInstructionsPlaceholder", "Special instructions (less spicy, no onions…)")}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-xs p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">{t("paymentMethod", "Payment Method")}</p>
          <label className="flex items-center gap-3 p-3.5 rounded-2xl border-2 border-[#132A1E] bg-[#132A1E]/5 cursor-pointer">
            <span className="text-2xl">💵</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{t("payAtRestaurant", "Pay at Restaurant")}</p>
              <p className="text-xs text-gray-400">Settle your consolidated bill when you finish</p>
            </div>
            <div className="h-5 w-5 rounded-full border-2 border-[#132A1E] flex items-center justify-center flex-shrink-0">
              <div className="h-2.5 w-2.5 rounded-full bg-[#132A1E]" />
            </div>
          </label>
        </div>

        {/* Order summary (Clean without CGST/taxes) */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-xs p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">{t("orderSummary", "Order Summary")}</p>
          <div className="space-y-1.5 divide-y divide-gray-50">
            {lines.map((l) => (
              <div key={l.item.id} className="flex justify-between text-xs py-1.5 text-gray-700">
                <span className="truncate pr-3">
                  <b className="text-gray-900 font-bold">{l.quantity}×</b> {tDish(l.item.name)}
                </span>
                <span className="font-semibold text-gray-900 flex-shrink-0">
                  {formatRupees(l.item.priceCents * l.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 mt-2 border-t border-gray-100 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>{t("subtotal", "Subtotal")}</span>
              <span className="font-semibold text-gray-800">{formatRupees(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 text-xs">
                <span>
                  {restaurantDiscount.name} ({restaurantDiscount.percent}% OFF)
                </span>
                <span>−{formatRupees(discount)}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-gray-950 text-base pt-2 border-t border-gray-100">
              <span>{t("total", "Total")}</span>
              <span>{formatRupees(grandTotal)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 font-medium">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-black/5 p-4 safe-pb z-30 shadow-lg">
        <button
          onClick={placeOrder}
          disabled={submitting || lines.length === 0}
          className="w-full bg-[#132A1E] text-white flex items-center justify-between px-5 py-4 text-base shadow-xl rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-all font-bold"
        >
          <span>{submitting ? t("placingOrder", "Placing Order…") : t("placeOrder", "Place Order")}</span>
          {!submitting && (
            <div className="flex items-center gap-2">
              <span>{formatRupees(grandTotal)}</span>
              <ChevronRight className="h-5 w-5" />
            </div>
          )}
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-2 flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" /> Contactless Kitchen Dispatch
        </p>
      </div>
    </div>
  );
}
