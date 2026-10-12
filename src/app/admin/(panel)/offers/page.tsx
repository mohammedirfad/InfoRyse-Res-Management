"use client";

import { useState } from "react";
import { Plus, X, Tag, Percent, ShoppingBag, Gift, Clock, Trash2, Pencil } from "lucide-react";

type Offer = {
  id: string; title: string; code: string; type: "DISCOUNT" | "BOGO" | "SPECIAL" | "THRESHOLD";
  value: number; isPercent: boolean; startDate: string; endDate: string;
  usageLimit: number; perCustomerLimit: number; isActive: boolean;
  applicableTo: "ALL" | "CATEGORIES" | "ITEMS"; description: string;
};

const SAMPLE_OFFERS: Offer[] = [
  { id: "1", title: "Flat 10% Off", code: "FLAT10", type: "DISCOUNT", value: 10, isPercent: true, startDate: "2026-10-01", endDate: "2026-10-31", usageLimit: 100, perCustomerLimit: 1, isActive: true, applicableTo: "ALL", description: "Get 10% off on all Main Course items." },
  { id: "2", title: "Buy 1 Get 1 Free", code: "BUY1GET1", type: "BOGO", value: 0, isPercent: false, startDate: "2026-10-01", endDate: "2026-10-20", usageLimit: 50, perCustomerLimit: 1, isActive: true, applicableTo: "ITEMS", description: "Buy 1 Burger and Get 1 Free." },
  { id: "3", title: "Weekend Special", code: "WEEKEND50", type: "SPECIAL", value: 50, isPercent: false, startDate: "2026-10-14", endDate: "2026-10-15", usageLimit: 0, perCustomerLimit: 0, isActive: false, applicableTo: "ALL", description: "Special menu at flat ₹50 off." },
  { id: "4", title: "Happy Hours", code: "HAPPYHRS", type: "DISCOUNT", value: 15, isPercent: true, startDate: "2026-10-01", endDate: "2026-10-31", usageLimit: 200, perCustomerLimit: 1, isActive: true, applicableTo: "CATEGORIES", description: "15% off on all beverages (3 PM – 6 PM)." },
];

const TYPE_META: Record<string, { icon: typeof Percent; label: string; color: string }> = {
  DISCOUNT:  { icon: Percent,     label: "Discount",  color: "text-green-600 bg-green-50 border-green-200"  },
  BOGO:      { icon: ShoppingBag, label: "BOGO",      color: "text-blue-600 bg-blue-50 border-blue-200"     },
  SPECIAL:   { icon: Gift,        label: "Special",   color: "text-purple-600 bg-purple-50 border-purple-200" },
  THRESHOLD: { icon: Tag,         label: "Threshold", color: "text-amber-600 bg-amber-50 border-amber-200"  },
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>(SAMPLE_OFFERS);
  const [selected, setSelected] = useState<Offer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [form, setForm] = useState({
    title: "", code: "", type: "DISCOUNT" as Offer["type"], value: "", isPercent: true,
    startDate: "", endDate: "", usageLimit: "", perCustomerLimit: "1",
    isActive: true, applicableTo: "ALL" as Offer["applicableTo"], description: "",
  });

  const filtered = offers.filter((o) => {
    if (activeTab === "active") return o.isActive;
    if (activeTab === "scheduled") return !o.isActive && new Date(o.startDate) > new Date();
    if (activeTab === "expired") return new Date(o.endDate) < new Date();
    return true;
  });

  function openEdit(o: Offer) {
    setSelected(o);
    setForm({
      title: o.title, code: o.code, type: o.type, value: o.value.toString(), isPercent: o.isPercent,
      startDate: o.startDate, endDate: o.endDate, usageLimit: o.usageLimit.toString(),
      perCustomerLimit: o.perCustomerLimit.toString(), isActive: o.isActive,
      applicableTo: o.applicableTo, description: o.description,
    });
    setShowForm(true);
  }

  function openAdd() {
    setSelected(null);
    setForm({ title: "", code: "", type: "DISCOUNT", value: "", isPercent: true, startDate: "", endDate: "", usageLimit: "", perCustomerLimit: "1", isActive: true, applicableTo: "ALL", description: "" });
    setShowForm(true);
  }

  function saveOffer() {
    if (selected) {
      setOffers((prev) => prev.map((o) => o.id === selected.id ? { ...o, ...form, value: Number(form.value), usageLimit: Number(form.usageLimit), perCustomerLimit: Number(form.perCustomerLimit) } : o));
    } else {
      setOffers((prev) => [...prev, { ...form, id: Date.now().toString(), value: Number(form.value), usageLimit: Number(form.usageLimit), perCustomerLimit: Number(form.perCustomerLimit) }]);
    }
    setShowForm(false); setSelected(null);
  }

  function deleteOffer(id: string) {
    if (!confirm("Delete this offer?")) return;
    setOffers((prev) => prev.filter((o) => o.id !== id));
    if (selected?.id === id) { setSelected(null); setShowForm(false); }
  }

  const stats = [
    { label: "Active Offers",    val: offers.filter((o) => o.isActive).length,                       icon: "🎁", bg: "bg-green-50" },
    { label: "Total Offers",     val: offers.length,                                                   icon: "📦", bg: "bg-blue-50"  },
    { label: "Scheduled",        val: offers.filter((o) => !o.isActive && new Date(o.startDate) > new Date()).length, icon: "⏰", bg: "bg-amber-50" },
    { label: "Expired",          val: offers.filter((o) => new Date(o.endDate) < new Date()).length,   icon: "🏷️", bg: "bg-gray-50"  },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#132A1E] to-[#2D5A3D] text-white px-6 py-5">
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display">Offers & Promotions 🌿</h1>
              <p className="text-white/60 text-sm mt-0.5">Create attractive offers to delight your customers and boost your sales.</p>
            </div>
            <button onClick={openAdd} className="btn-primary bg-white text-[#132A1E] text-sm px-4 py-2 font-semibold">
              <Plus className="h-4 w-4" /> Create New Offer
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className={`card p-4 ${s.bg}`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <p className="text-2xl font-bold text-gray-900">{s.val}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {[["all","All Offers"], ["active","Active"], ["scheduled","Scheduled"], ["expired","Expired"]].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-all ${activeTab === id ? "bg-[#132A1E] text-white" : "bg-white border border-black/8 text-gray-600"}`}>
                {label}
              </button>
            ))}
            <input className="input ml-auto max-w-xs" placeholder="Search offers…" />
          </div>

          {/* Offers grid */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((o) => {
              const meta = TYPE_META[o.type] ?? TYPE_META.DISCOUNT;
              const expired = new Date(o.endDate) < new Date();
              return (
                <div key={o.id} className={`card overflow-hidden cursor-pointer hover:shadow-md transition-all ${!o.isActive ? "opacity-70" : ""}`} onClick={() => openEdit(o)}>
                  {/* Color header */}
                  <div className={`relative h-28 bg-gradient-to-br from-[#132A1E] to-[#2D5A3D] flex items-center justify-center`}>
                    <div className="text-center text-white">
                      {o.isPercent ? <p className="text-4xl font-bold">{o.value}%<span className="text-lg"> OFF</span></p>
                        : o.type === "BOGO" ? <p className="text-2xl font-bold">BUY 1<br/>GET 1</p>
                        : <p className="text-3xl font-bold">SPECIAL</p>}
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className={`badge border ${o.isActive && !expired ? "bg-green-100 text-green-700 border-green-200" : expired ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                        {expired ? "Expired" : o.isActive ? "Active" : "Scheduled"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{o.title}</p>
                        <p className="text-xs font-mono text-[#D4A94C] mt-0.5 bg-amber-50 rounded px-1.5 py-0.5 inline-block">{o.code}</p>
                      </div>
                      <span className={`badge border text-xs flex-shrink-0 ${meta.color}`}>
                        {o.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-1">{o.description}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{o.endDate}</div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEdit(o)} className="p-1 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deleteOffer(o.id)} className="p-1 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create/Edit side panel */}
      {showForm && (
        <div className="w-80 flex-shrink-0 border-l border-black/5 bg-white flex flex-col overflow-hidden animate-slide-in-right">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <h2 className="font-semibold text-gray-900">{selected ? "Edit Offer" : "Create / Edit Offer"}</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Offer Title *</label>
              <input className="input" placeholder="e.g. Weekend Special" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Offer Description *</label>
              <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the offer briefly…" />
              <p className="text-right text-[10px] text-gray-300">{form.description.length}/300</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Offer Type *</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Offer["type"] })}>
                <option value="DISCOUNT">Percentage Discount</option>
                <option value="BOGO">Buy 1 Get 1 (BOGO)</option>
                <option value="SPECIAL">Special Offer</option>
                <option value="THRESHOLD">Food Amount Threshold</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Discount Value *</label>
                <input className="input" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="e.g. 10" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Discount Value (%)</label>
                <div className="flex gap-1">
                  <button onClick={() => setForm({ ...form, isPercent: true })} className={`flex-1 rounded-xl py-2.5 text-xs font-medium border transition-all ${form.isPercent ? "bg-[#132A1E] text-white border-transparent" : "border-black/10 text-gray-500"}`}>%</button>
                  <button onClick={() => setForm({ ...form, isPercent: false })} className={`flex-1 rounded-xl py-2.5 text-xs font-medium border transition-all ${!form.isPercent ? "bg-[#132A1E] text-white border-transparent" : "border-black/10 text-gray-500"}`}>₹</button>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Validity Period *</label>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                <input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Applicable Items *</label>
              <div className="flex gap-2">
                {["ALL", "CATEGORIES", "ITEMS"].map((v) => (
                  <button key={v} onClick={() => setForm({ ...form, applicableTo: v as Offer["applicableTo"] })}
                    className={`flex-1 rounded-xl py-2 text-xs font-medium border transition-all ${form.applicableTo === v ? "bg-[#132A1E] text-white border-transparent" : "border-black/10 text-gray-500"}`}>
                    {v === "ALL" ? "All Items" : v === "CATEGORIES" ? "Categories" : "Specific Items"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Usage Limit (Optional)</label>
                <input className="input" type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="0 = unlimited" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Per Customer Limit</label>
                <input className="input" type="number" value={form.perCustomerLimit} onChange={(e) => setForm({ ...form, perCustomerLimit: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-sm font-medium text-gray-700">Active</span>
              <button onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={`relative h-6 w-10 rounded-full transition-colors ${form.isActive ? "bg-[#132A1E]" : "bg-gray-300"}`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.isActive ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </div>
          </div>
          <div className="p-5 border-t border-black/5 grid grid-cols-2 gap-2">
            <button onClick={() => setShowForm(false)} className="btn-primary border-2 border-black/10 text-gray-600 justify-center py-3 rounded-2xl text-sm">Cancel</button>
            <button onClick={saveOffer} className="btn-primary bg-[#132A1E] text-white justify-center py-3 rounded-2xl text-sm">
              {selected ? "Update Offer" : "Save Offer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
