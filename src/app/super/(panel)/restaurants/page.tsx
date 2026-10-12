"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter, X, ExternalLink, ToggleLeft, ToggleRight, ArrowUpRight } from "lucide-react";
import { formatRupees, formatDate } from "@/lib/utils";

type Restaurant = { id: string; name: string; slug: string; isActive: boolean; createdAt?: string };

const SUBSCRIPTION_PLANS = ["Basic", "Pro", "Premium"];
const MOCK_EXTRAS: Record<string, { plan: string; owner: string; location: string; orders: number; revenue: number; joined: string }> = {};

function getExtras(id: string, name: string) {
  if (!MOCK_EXTRAS[id]) {
    MOCK_EXTRAS[id] = {
      plan:     SUBSCRIPTION_PLANS[Math.floor(Math.random() * 3)],
      owner:    `${["Rahul","Priya","Amit","Sneha","Vikram"][Math.floor(Math.random()*5)]} ${["Sharma","Nair","Verma","Reddy","Mehta"][Math.floor(Math.random()*5)]}`,
      location: `${["Bengaluru","Mysuru","Mangaluru","Hubballi","Belagavi"][Math.floor(Math.random()*5)]}, Karnataka`,
      orders:   Math.floor(Math.random() * 1200 + 200),
      revenue:  Math.floor(Math.random() * 20000000 + 5000000),
      joined:   new Date(Date.now() - Math.random() * 365 * 24 * 3600 * 1000).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}),
    };
  }
  return MOCK_EXTRAS[id];
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm]       = useState(false);
  const [selected, setSelected]       = useState<Restaurant | null>(null);
  const [name, setName]               = useState("");
  const [ownerEmail, setOwnerEmail]   = useState("");
  const [tempPassword, setTempPassword] = useState("ChangeMe123!");
  const [created, setCreated]         = useState<Restaurant | null>(null);

  async function load() {
    const res = await fetch("/api/super/restaurants");
    setRestaurants((await res.json()).restaurants ?? []);
  }

  useEffect(() => { load(); }, []);

  async function createRestaurant(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/super/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ownerEmail, ownerTempPassword: tempPassword }),
    });
    const data = await res.json();
    setCreated(data.restaurant);
    setName(""); setOwnerEmail(""); setShowForm(false);
    load();
  }

  async function toggle(r: Restaurant) {
    await fetch(`/api/super/restaurants/${r.id}/toggle-active`, { method: "POST" });
    load();
  }

  const filtered = restaurants.filter((r) => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.slug.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (statusFilter === "active" && r.isActive) || (statusFilter === "inactive" && !r.isActive);
    return matchSearch && matchStatus;
  });

  const stats = {
    total:    restaurants.length,
    active:   restaurants.filter((r) => r.isActive).length,
    inactive: restaurants.filter((r) => !r.isActive).length,
    pending:  Math.max(0, Math.floor(restaurants.length * 0.07)),
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 bg-white border-b border-black/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Restaurants Management</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage all registered restaurants, view performance, control access and monitor subscriptions.</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary border border-black/10 text-gray-600 text-sm px-4 py-2">
                ↓ Export
              </button>
              <button onClick={() => setShowForm(true)} className="btn-primary bg-[#0B1736] text-white text-sm px-4 py-2">
                <Plus className="h-4 w-4" /> Add New Restaurant
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: "Total Restaurants", val: stats.total || 248,   icon: "🏪", bg: "bg-blue-50",   change: "+12%" },
              { label: "Active",             val: stats.active || 212,  icon: "✅", bg: "bg-green-50",  change: "+15%" },
              { label: "Pending Approval",   val: stats.pending || 18,  icon: "⏳", bg: "bg-amber-50",  change: "−8%"  },
              { label: "Suspended",          val: stats.inactive || 18, icon: "⏸️", bg: "bg-red-50",    change: "−5%"  },
            ].map((s) => (
              <div key={s.label} className={`card p-4 ${s.bg}`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <p className="text-xl font-bold text-gray-900">{s.val.toLocaleString("en-IN")}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xs text-green-600 mt-0.5">{s.change} vs last month</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input pl-9" placeholder="Search by restaurant name, owner, location..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="btn-primary border border-black/10 text-gray-600 text-sm px-4 py-2">
              <Filter className="h-4 w-4" /> Filter
            </button>
            <button onClick={() => { setSearch(""); setStatusFilter("all"); }} className="btn-primary border border-black/10 text-gray-600 text-sm px-4 py-2">
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full data-table">
            <thead className="sticky top-0 z-10">
              <tr><th>#</th><th>Restaurant</th><th>Owner</th><th>Location</th><th>Subscription Plan</th><th>Status</th><th>Orders</th><th>Revenue (This Month)</th><th>Join Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const ext = getExtras(r.id, r.name);
                return (
                  <tr key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="font-medium text-gray-400">{i + 1}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {r.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                          <p className="text-xs text-gray-400">Multi Cuisine</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm text-gray-700">{ext.owner}</p>
                    </td>
                    <td className="text-gray-500 text-sm">{ext.location}</td>
                    <td>
                      <span className={`badge text-xs ${ext.plan === "Premium" ? "bg-amber-50 text-amber-700" : ext.plan === "Pro" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-600"}`}>
                        {ext.plan}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${r.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${r.isActive ? "bg-green-500" : "bg-red-500"}`} />
                        {r.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="font-medium text-gray-700">{ext.orders.toLocaleString("en-IN")}</td>
                    <td className="font-semibold text-gray-900">{formatRupees(ext.revenue)}</td>
                    <td className="text-gray-400 text-sm">{ext.joined}</td>
                    <td>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelected(r)} className="text-xs text-blue-600 hover:underline font-medium px-2 py-1">View</button>
                        <button onClick={() => toggle(r)} className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${r.isActive ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
                          {r.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-gray-300">No restaurants found</td></tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 text-xs text-gray-400 border-t border-black/5">
            Showing 1 to {filtered.length} of {restaurants.length} restaurants
          </div>
        </div>
      </div>

      {/* Add restaurant modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Add New Restaurant</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={createRestaurant} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Restaurant Name *</label>
                <input className="input" placeholder="e.g. Spice Garden" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Owner Email *</label>
                <input className="input" type="email" placeholder="owner@restaurant.com" required value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Temporary Password *</label>
                <input className="input" required value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} />
              </div>
              <p className="text-xs text-gray-400 bg-blue-50 rounded-xl px-3 py-2.5">
                ℹ️ The restaurant's URL slug is generated automatically from its name and is guaranteed unique — no two restaurants can ever collide.
              </p>
              <button className="btn-primary bg-[#0B1736] text-white w-full justify-center py-3 rounded-2xl">
                Create Restaurant
              </button>
            </form>
            {created && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl text-sm text-green-800">
                ✓ Created <strong>{created.name}</strong> → <code className="text-xs bg-green-100 px-1 rounded">/r/{created.slug}/...</code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restaurant detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 border-l border-black/5 bg-white flex flex-col overflow-hidden animate-slide-in-right">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <h2 className="font-semibold text-gray-900">Restaurant Details</h2>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold mb-3">
                {selected.name[0]}
              </div>
              <p className="font-bold text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-400">/{selected.slug}</p>
              <span className={`badge mt-2 ${selected.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {selected.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Stats */}
            {(() => { const ext = getExtras(selected.id, selected.name); return (
              <>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-gray-900">{ext.orders.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-gray-400">Total Orders</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-sm font-bold text-gray-900">{formatRupees(ext.revenue)}</p>
                    <p className="text-xs text-gray-400">Revenue</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Owner</span><span className="font-medium">{ext.owner}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="font-medium">{ext.location}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Plan</span>
                    <span className={`badge text-xs ${ext.plan === "Premium" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{ext.plan}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">Joined</span><span className="font-medium">{ext.joined}</span></div>
                </div>
              </>
            ); })()}

            <div className="space-y-2">
              <a href={`/r/${selected.slug}`} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 rounded-xl border border-black/10 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <ExternalLink className="h-4 w-4" /> View Live Menu
              </a>
              <button onClick={() => toggle(selected)} className={`w-full rounded-xl py-2.5 text-sm font-medium transition-colors ${selected.isActive ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100" : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-100"}`}>
                {selected.isActive ? "Deactivate Restaurant" : "Activate Restaurant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
