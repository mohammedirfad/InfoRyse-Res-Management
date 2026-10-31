"use client";

import { useEffect, useState } from "react";
import { Save, Bell, Shield, Trash2, AlertTriangle, Key, Percent, Plus } from "lucide-react";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-[#132A1E]" : "bg-gray-200"}`}>
      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

// ── MenuQrSettings must be its own component — hooks can't be used inside .map()
function MenuQrSettings() {
  const [showVegBadges,      setShowVegBadges]      = useState(true);
  const [showDescriptions,   setShowDescriptions]   = useState(true);
  const [allowInstructions,  setAllowInstructions]  = useState(true);
  const [showPrices,         setShowPrices]         = useState(true);
  const [showUnavailable,    setShowUnavailable]    = useState(true);

  const items = [
    { label:"Show Veg/Non-Veg Badges",       desc:"Display dietary indicators on menu items.", val:showVegBadges,     set:setShowVegBadges     },
    { label:"Show Item Descriptions",        desc:"Show descriptions below item names.",        val:showDescriptions,  set:setShowDescriptions  },
    { label:"Allow Special Instructions",   desc:"Let customers add notes per order.",          val:allowInstructions, set:setAllowInstructions },
    { label:"Show Prices",                   desc:"Display prices on the public menu.",          val:showPrices,        set:setShowPrices        },
    { label:"Show Unavailable Items",        desc:"Show unavailable items greyed out.",          val:showUnavailable,   set:setShowUnavailable   },
  ];
  return (
    <div className="card p-5 max-w-2xl space-y-1">
      <h2 className="font-semibold text-gray-900 mb-3">Menu & QR Settings</h2>
      {items.map(({ label, desc, val, set }) => (
        <div key={label} className="flex items-center justify-between py-3.5 border-t border-black/5 gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
          <Toggle checked={val} onChange={set} />
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("general");

  // Restaurant settings (from API)
  const [restName, setRestName]       = useState("");
  const [openNow, setOpenNow]         = useState(true);
  const [taxName, setTaxName]         = useState("GST");
  const [taxPercent, setTaxPercent]   = useState("5");
  const [additionalTaxes, setAdditionalTaxes] = useState<Array<{ name: string; percent: number }>>([]);
  const [upiPaymentId, setUpiPaymentId] = useState("");

  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [passwordExpiry, setPasswordExpiry] = useState("90");
  const [notifs, setNotifs] = useState({
    newOrder: true, lowStock: false, customerReview: true, dailySales: false,
  });
  const [security, setSecurity] = useState({
    twoFactor: false, loginAlerts: true,
  });

  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.json()).then(d => {
      if (d.role === "STAFF") {
        setAccessDenied(true);
        return;
      }
      if (d.restaurant) {
        setRestName(d.restaurant.name ?? "");
        setOpenNow(d.restaurant.openNow ?? true);
        setTaxName(d.restaurant.taxName ?? "GST");
        setTaxPercent(String(d.restaurant.taxPercent ?? 5));
        setAdditionalTaxes(Array.isArray(d.restaurant.additionalTaxes) ? d.restaurant.additionalTaxes : []);
        setUpiPaymentId(d.restaurant.upiPaymentId ?? "");
      }
    });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/admin/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: restName, openNow,
        taxName, taxPercent: Number(taxPercent), additionalTaxes, upiPaymentId,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const TABS = [
    { id: "general",       label: "General Settings",     icon: "⚙️" },
    { id: "tax",           label: "Tax & Billing",        icon: "🧾" },
    { id: "menu",          label: "Menu & QR Settings",   icon: "🍽️" },
    { id: "notifications", label: "Notification Settings", icon: "🔔" },
    { id: "security",      label: "Security Settings",    icon: "🔒" },
    { id: "danger",        label: "Danger Zone",          icon: "⚠️" },
  ];

  if (accessDenied) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 pt-16">
        <div className="h-16 w-16 mx-auto bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Owner Access Required</h2>
        <p className="text-sm text-slate-500">
          Restaurant Settings and Configuration can only be modified by the restaurant owner.
        </p>
        <div className="pt-2">
          <a href="/admin/orders" className="btn-primary bg-[#132A1E] text-white py-2.5 px-5 rounded-xl inline-flex text-xs font-bold">
            ← Return to Orders Queue
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-screen overflow-hidden">
      {/* Settings sidebar nav — horizontal scroll on mobile, vertical on desktop */}
      <div className="lg:w-52 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-black/5 bg-white p-3 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-hidden no-scrollbar">
        <p className="hidden lg:block text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Settings</p>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 lg:w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-left transition-all whitespace-nowrap
              ${tab === t.id ? "bg-[#132A1E] text-white" : "text-gray-600 hover:bg-gray-50 border border-black/5 lg:border-0"}`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3.5 border-b border-black/5 bg-white flex-shrink-0">
          <h1 className="text-base lg:text-lg font-semibold text-gray-900">Settings 🌿</h1>
          <button onClick={save} disabled={saving}
            className="btn-primary bg-[#132A1E] text-white text-sm px-4 py-2 rounded-xl disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === "general" && (
            <div className="card p-6 space-y-4 max-w-2xl">
              <h2 className="font-semibold text-gray-900">General Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Restaurant Name</label>
                  <input className="input" value={restName} onChange={e => setRestName(e.target.value)} placeholder="Your restaurant name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Default Language</label>
                  <select className="input"><option>English</option><option>Hindi</option><option>Kannada</option></select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Time Zone</label>
                  <select className="input"><option>(GMT+5:30) Asia/Kolkata</option></select>
                </div>
              </div>
              <div className="flex items-center justify-between py-3.5 border-t border-black/5">
                <div>
                  <p className="text-sm font-medium text-gray-900">Restaurant Open Now</p>
                  <p className="text-xs text-gray-400">Toggle to open or close your restaurant for orders</p>
                </div>
                <Toggle checked={openNow} onChange={setOpenNow} />
              </div>
            </div>
          )}

          {tab === "tax" && (
            <div className="card p-6 max-w-2xl space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="h-5 w-5 text-[#132A1E]" />
                <h2 className="font-semibold text-gray-900">Tax & Billing Configuration</h2>
              </div>
              <p className="text-sm text-gray-500">Add the tax rates your restaurant applies. Each rate is calculated on the discounted subtotal and shown as its own line on bills.</p>
              <div className="rounded-2xl border border-black/5 p-4 space-y-3">
                <div className="grid grid-cols-[1fr_130px] gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Primary tax</label>
                    <input className="input" placeholder="GST" value={taxName} onChange={e => setTaxName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Rate (%)</label>
                    <input className="input" type="number" min="0" max="30" step="0.01" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} />
                  </div>
                </div>
                {additionalTaxes.map((tax, index) => (
                  <div key={index} className="grid grid-cols-[1fr_130px_40px] items-end gap-3 border-t border-black/5 pt-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Additional tax name</label>
                      <input className="input" placeholder="Service tax" value={tax.name} onChange={e => setAdditionalTaxes(current => current.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Rate (%)</label>
                      <input className="input" type="number" min="0" max="30" step="0.01" value={tax.percent} onChange={e => setAdditionalTaxes(current => current.map((item, i) => i === index ? { ...item, percent: Number(e.target.value) } : item))} />
                    </div>
                    <button type="button" aria-label={`Remove ${tax.name || "tax"}`} onClick={() => setAdditionalTaxes(current => current.filter((_, i) => i !== index))} className="mb-1 flex h-10 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setAdditionalTaxes(current => [...current, { name: "", percent: 0 }])} className="inline-flex items-center gap-2 rounded-xl border border-emerald-700/20 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"><Plus className="h-4 w-4" /> Add another tax</button>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Optional UPI ID for bill payment QR</label>
                <input className="input" value={upiPaymentId} onChange={(e) => setUpiPaymentId(e.target.value)} placeholder="restaurant@upi" />
                <p className="text-xs text-gray-400 mt-1">Leave blank to omit the QR. Staff must confirm payment manually.</p>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-black/5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Bill Preview</p>
                <div className="space-y-1.5 text-sm font-mono">
                  {[{ name: taxName || "GST", percent: Number(taxPercent || 0) }, ...additionalTaxes].filter((tax) => tax.name.trim() && tax.percent > 0).map((tax, index) => (
                    <div key={index} className="flex justify-between text-gray-600">
                      <span>{tax.name} ({tax.percent}%)</span>
                      <span>Rs {((500 * tax.percent) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-black/5">
                    <span>Total</span>
                    <span>Rs {(500 + ([{ name: taxName, percent: Number(taxPercent || 0) }, ...additionalTaxes].reduce((sum, tax) => sum + (tax.name.trim() ? tax.percent : 0), 0) * 5)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}


          {tab === "notifications" && (
            <div className="card p-6 space-y-4 max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-5 w-5 text-[#132A1E]" />
                <h2 className="font-semibold text-gray-900">Notification Settings</h2>
              </div>
              <p className="text-sm text-gray-400">Manage your alerts and notifications.</p>
              {[
                { key: "newOrder",      label: "New Order Notification",   desc: "Get notified when a new order is received."     },
                { key: "lowStock",      label: "Low Stock Alert",          desc: "Get notified when items are low in stock."      },
                { key: "customerReview",label: "Customer Review Alert",    desc: "Get notified for new customer reviews."         },
                { key: "dailySales",    label: "Daily Sales Report",       desc: "Receive daily sales summary via email."         },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3 border-t border-black/5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <Toggle checked={(notifs as any)[key]} onChange={(v) => setNotifs((prev) => ({ ...prev, [key]: v }))} />
                </div>
              ))}
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-4 max-w-2xl">
              <div className="card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-[#132A1E]" />
                  <h2 className="font-semibold text-gray-900">Security Settings</h2>
                </div>
                {[
                  { key: "twoFactor",   label: "Two-Factor Authentication (2FA)", desc: "For admin accounts." },
                  { key: "loginAlerts", label: "Login Alerts",                    desc: "Notify on new login attempts." },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3 border-t border-black/5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <Toggle checked={(security as any)[key]} onChange={(v) => setSecurity((prev) => ({ ...prev, [key]: v }))} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-black/5">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Session Timeout</label>
                    <select className="input" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)}>
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">1 Hour</option>
                      <option value="240">4 Hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Password Expiry</label>
                    <select className="input" value={passwordExpiry} onChange={(e) => setPasswordExpiry(e.target.value)}>
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="h-5 w-5 text-[#132A1E]" />
                  <h2 className="font-semibold text-gray-900">Change Password</h2>
                </div>
                <div className="space-y-3">
                  <input className="input" type="password" placeholder="Current password" />
                  <input className="input" type="password" placeholder="New password" />
                  <input className="input" type="password" placeholder="Confirm new password" />
                  <button className="btn-primary bg-[#132A1E] text-white text-sm px-5 py-2.5">Update Password</button>
                </div>
              </div>
            </div>
          )}

          {tab === "danger" && (
            <div className="card p-6 border-2 border-red-100 max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h2 className="font-semibold text-red-600">Danger Zone</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">These actions are permanent and cannot be undone.</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-red-100 bg-red-50/50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Clear All Menu Items</p>
                    <p className="text-xs text-gray-400">Remove all menu items from this restaurant. Orders history is preserved.</p>
                  </div>
                  <button className="btn-primary border-2 border-red-200 text-red-500 text-sm px-4 py-2 hover:bg-red-50">Clear Menu</button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-red-100 bg-red-50/50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Delete Restaurant Account</p>
                    <p className="text-xs text-gray-400">Permanently delete this restaurant and all associated data.</p>
                  </div>
                  <button className="btn-primary bg-red-500 text-white text-sm px-4 py-2">
                    <Trash2 className="h-4 w-4" /> Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "menu" && (
            <MenuQrSettings />
          )}
        </div>
      </div>
    </div>
  );
}
