"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ShoppingBag, TrendingUp, Users, ArrowRight } from "lucide-react";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt?: string;
  _count?: { orders: number; tables: number };
  users?: { email: string; name: string }[];
};

export default function SuperDashboardPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super/restaurants")
      .then((r) => r.json())
      .then((d) => {
        setRestaurants(d.restaurants ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalRestaurants = restaurants.length;
  const activeCount   = restaurants.filter((r) => r.isActive).length;
  const inactiveCount = totalRestaurants - activeCount;
  const totalOrders   = restaurants.reduce((sum, r) => sum + (r._count?.orders ?? 0), 0);
  const totalTables   = restaurants.reduce((sum, r) => sum + (r._count?.tables ?? 0), 0);

  // Derive top restaurants sorted by real order counts from database
  const topRestaurants = [...restaurants]
    .sort((a, b) => (b._count?.orders ?? 0) - (a._count?.orders ?? 0))
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1736] to-[#13234F] text-white px-6 py-5">
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-blue-500/10" />
        <div className="absolute top-4 right-20 h-20 w-20 rounded-full bg-blue-400/10" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/60 text-xs font-mono">{new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })}</p>
            <h1 className="text-2xl font-bold mt-0.5">Super Admin Control Hub 🛡️</h1>
            <p className="text-white/70 text-sm mt-1">Multi-tenant hospitality infrastructure and live restaurant monitoring.</p>
          </div>
          <Link href="/super/restaurants" className="btn-primary bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-xl font-semibold shadow-md">
            + Add New Restaurant
          </Link>
        </div>
      </div>

      {/* Real KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Restaurants", val: totalRestaurants, icon: Building2, color: "text-blue-600", bg: "bg-blue-50", badge: `${activeCount} Active` },
          { label: "Total Platform Orders", val: totalOrders, icon: ShoppingBag, color: "text-emerald-600", bg: "bg-emerald-50", badge: "Live DB" },
          { label: "Active Dining Tables", val: totalTables, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", badge: "Configured" },
          { label: "Platform Partners", val: totalRestaurants, icon: Users, color: "text-purple-600", bg: "bg-purple-50", badge: `${inactiveCount} Paused` },
        ].map((k) => (
          <div key={k.label} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`h-9 w-9 rounded-xl ${k.bg} flex items-center justify-center`}>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {k.badge}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? "..." : k.val.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Top Restaurants & Recent Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top Restaurants by Volume */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Active Tenant Performance</h2>
              <p className="text-xs text-gray-400 mt-0.5">Top restaurants ordered by total guest orders processed</p>
            </div>
            <Link href="/super/restaurants" className="text-xs text-blue-600 font-semibold hover:underline">
              Manage All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs text-gray-400 uppercase tracking-wider text-left">
                  <th className="pb-2.5">#</th>
                  <th className="pb-2.5">Restaurant</th>
                  <th className="pb-2.5">Orders</th>
                  <th className="pb-2.5">Tables</th>
                  <th className="pb-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {topRestaurants.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-gray-400">{i === 0 ? "🥇" : i + 1}</td>
                    <td className="py-3">
                      <p className="font-semibold text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-400 font-mono">/{r.slug}</p>
                    </td>
                    <td className="py-3 font-mono font-semibold text-gray-700">
                      {(r._count?.orders ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 font-mono text-gray-600">
                      {r._count?.tables ?? 0}
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                      }`}>
                        {r.isActive ? "Active" : "Paused"}
                      </span>
                    </td>
                  </tr>
                ))}
                {topRestaurants.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">
                      No restaurants registered yet. Click &quot;Add New Restaurant&quot; to onboard your first partner.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Restaurants */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <div>
              <h2 className="font-semibold text-gray-900">Recent Onboarded Partners</h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest restaurant accounts added to the platform</p>
            </div>
            <Link href="/super/restaurants" className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-black/5">
            {restaurants.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-xs">
                    {r.name[0]?.toUpperCase() || "R"}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-400 font-mono">/{r.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${r.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                  <Link
                    href={`/r/${r.slug}`}
                    target="_blank"
                    className="text-xs text-slate-400 hover:text-blue-600"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
            {restaurants.length === 0 && !loading && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                No restaurants yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Active Operational Partners", val: `${activeCount} Live`, icon: "🏪", color: "bg-blue-50" },
          { label: "Configured Tables", val: `${totalTables} Tables`, icon: "🪑", color: "bg-emerald-50" },
          { label: "Suspended / Inactive", val: `${inactiveCount} Paused`, icon: "⏸️", color: "bg-rose-50" },
          { label: "Total Managed Tenants", val: `${totalRestaurants} Tenants`, icon: "🏢", color: "bg-purple-50" },
        ].map((s) => (
          <div key={s.label} className={`card p-4 ${s.color}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-lg font-bold text-gray-900">{s.val}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
