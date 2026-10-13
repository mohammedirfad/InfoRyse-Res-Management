"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Percent,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Sliders,
  Calendar,
  Zap,
} from "lucide-react";

export default function OffersPage() {
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [savedSuccess, setSavedSuccess]       = useState(false);

  // Live Database Restaurant Discount Fields
  const [discountActive, setDiscountActive]   = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [discountName, setDiscountName]       = useState("Festival Special Offer");
  const [restaurantName, setRestaurantName]   = useState("Restaurant");

  // Load live restaurant settings from DB
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/restaurant");
        if (res.ok) {
          const data = await res.json();
          if (data.restaurant) {
            setRestaurantName(data.restaurant.name ?? "Restaurant");
            setDiscountActive(Boolean(data.restaurant.discountActive));
            setDiscountPercent(Number(data.restaurant.discountPercent ?? 10) || 10);
            setDiscountName(data.restaurant.discountName || "Festival Special Offer");
          }
        }
      } catch (err) {
        console.error("Failed to load restaurant settings", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSaveDiscount(newActive?: boolean, newPercent?: number, newName?: string) {
    setSaving(true);
    setSavedSuccess(false);

    const activeToSave  = newActive !== undefined ? newActive : discountActive;
    const percentToSave = newPercent !== undefined ? newPercent : discountPercent;
    const nameToSave    = newName !== undefined ? newName : discountName;

    try {
      const res = await fetch("/api/admin/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountActive: activeToSave,
          discountPercent: Number(percentToSave),
          discountName: nameToSave.trim() || "Special Offer",
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save discount settings", err);
    } finally {
      setSaving(false);
    }
  }

  // Pre-configured popular festival/campaign presets for instant 1-click activation
  const CAMPAIGN_PRESETS = [
    { name: "Diwali Festive Dhamaka", percent: 15, tag: "🪔 Festive" },
    { name: "Weekend Special Treat", percent: 10, tag: "🎉 Weekend" },
    { name: "New Year Celebration", percent: 20, tag: "🎆 Seasonal" },
    { name: "Monsoon Food Fiesta", percent: 12, tag: "🌧️ Special" },
    { name: "Chef's Anniversary Perk", percent: 25, tag: "🎂 Milestone" },
  ];

  const sampleBasePrice = 350; // ₹350
  const sampleSavings = Math.round(sampleBasePrice * (discountPercent / 100));
  const sampleDiscounted = sampleBasePrice - sampleSavings;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FBF7F1] overflow-y-auto">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#132A1E] to-[#244E35] text-white px-8 py-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#D4A94C]/25 text-[#D4A94C] border border-[#D4A94C]/30">
                <Sparkles className="h-3 w-3" /> Live Promotional Engine
              </span>
              <span className="text-xs text-white/60">Strict 1-Discount Rule Active</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Discounts & Festival Offers</h1>
            <p className="text-white/70 text-sm mt-1 max-w-xl">
              Enable or disable customer discounts for festivals, weekends, or special occasions. When active, all customer menus automatically reflect the discounted prices and offer banner.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSaveDiscount()}
              disabled={saving || loading}
              className="flex items-center gap-2 bg-[#D4A94C] hover:bg-[#c2983e] text-[#132A1E] px-6 py-3 rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all disabled:opacity-60"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-800" /> Saved to Live Menu!
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> Save Discount Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8">
        {/* Main Discount Toggle & Configuration Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/5 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold transition-colors ${
                  discountActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-400"
                }`}
              >
                %
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Campaign Discount Status</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Turn this ON during promotions or festivals. Turn OFF to return immediately to regular prices.
                </p>
              </div>
            </div>

            {/* Prominent Master Switch */}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${discountActive ? "text-emerald-700" : "text-gray-400"}`}>
                {discountActive ? "DISCOUNT ENABLED" : "DISCOUNT DISABLED"}
              </span>
              <button
                onClick={() => {
                  const nextState = !discountActive;
                  setDiscountActive(nextState);
                  handleSaveDiscount(nextState);
                }}
                disabled={loading}
                aria-label="Toggle discount"
                className={`relative h-9 w-16 rounded-full transition-colors flex-shrink-0 p-1 ${
                  discountActive ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full bg-white shadow-md transition-all ${
                    discountActive ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Configuration Form Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left: Inputs */}
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Campaign / Occasion Title
                </label>
                <input
                  type="text"
                  value={discountName}
                  onChange={(e) => setDiscountName(e.target.value)}
                  placeholder="e.g. Diwali Dhamaka Offer, Weekend Fest, Happy Hours"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#132A1E] transition-all"
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  This banner title appears prominently on top of the customer's QR menu.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Discount Percentage: <span className="text-emerald-700 text-sm font-black">{discountPercent}% OFF</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="flex-1 accent-emerald-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  <span className="w-14 text-center font-bold text-gray-900 bg-gray-100 py-1.5 rounded-xl text-sm border border-gray-200">
                    {discountPercent}%
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[5, 10, 15, 20, 25, 30].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDiscountPercent(val)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        discountPercent === val
                          ? "bg-[#132A1E] text-white shadow-xs"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold">Market-Standard Single Discount Policy</p>
                  <p className="mt-0.5 text-amber-800">
                    To prevent discount stacking and protect restaurant margins, InfoRyse enforces one active campaign discount at a time. The discount applies automatically to all food items and recalculates at table billing.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Live Customer Menu Preview */}
            <div className="bg-gray-50/90 rounded-2xl p-5 border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Customer Menu Live Preview
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    discountActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {discountActive ? "LIVE ON MOBILE" : "REGULAR PRICING"}
                </span>
              </div>

              {/* Mock Mobile View Card */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
                {/* Mock Banner */}
                {discountActive ? (
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-3 rounded-xl flex items-center justify-between text-xs animate-fade-in">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🎉</span>
                      <div>
                        <p className="font-extrabold leading-tight">{discountName}</p>
                        <p className="text-[10px] text-white/90">Flat {discountPercent}% OFF on all dishes</p>
                      </div>
                    </div>
                    <span className="bg-white/20 px-2 py-0.5 rounded-md font-black text-[11px]">
                      {discountPercent}% OFF
                    </span>
                  </div>
                ) : (
                  <div className="bg-gray-100 p-2.5 rounded-xl text-center text-xs text-gray-500 font-medium">
                    Standard Menu (No promotional discounts active)
                  </div>
                )}

                {/* Mock Item Card */}
                <div className="flex items-center justify-between p-2 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-2xl">
                      🍛
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Butter Chicken / Dosa</p>
                      <p className="text-[10px] text-gray-400">Chef's Signature Recipe</p>
                      <div className="flex items-center gap-2 mt-1">
                        {discountActive ? (
                          <>
                            <span className="text-xs font-extrabold text-emerald-700">
                              ₹{sampleDiscounted}
                            </span>
                            <span className="text-[11px] text-gray-400 line-through">
                              ₹{sampleBasePrice}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                              Save ₹{sampleSavings}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-gray-900">
                            ₹{sampleBasePrice}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                    + Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1-Click Festive & Occasion Presets */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">One-Click Festival & Campaign Templates</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Quickly load tailored discounts for upcoming festivals and seasonal rush periods.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {CAMPAIGN_PRESETS.map((preset, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border border-gray-200 hover:border-[#132A1E]/30 bg-gray-50/50 hover:bg-white transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-lg">
                    {preset.tag}
                  </span>
                  <span className="text-sm font-black text-emerald-700">{preset.percent}% OFF</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">{preset.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Applies instantly across entire menu</p>
                </div>
                <button
                  onClick={() => {
                    setDiscountName(preset.name);
                    setDiscountPercent(preset.percent);
                    setDiscountActive(true);
                    handleSaveDiscount(true, preset.percent, preset.name);
                  }}
                  className="w-full bg-[#132A1E] hover:bg-[#1C3C29] text-white py-2 rounded-xl text-xs font-bold active:scale-95 transition-all"
                >
                  Activate This Template
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
