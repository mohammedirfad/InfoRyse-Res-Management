"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Building2, ShoppingBag, TrendingUp, Users, ArrowRight, ArrowUpRight } from "lucide-react";
import { formatRupees } from "@/lib/utils";

type Restaurant = { id: string; name: string; slug: string; isActive: boolean; createdAt?: string };

// 30-day revenue mock trend
const REVENUE_DATA = Array.from({ length: 30 }, (_, i) => ({
  date: `${i + 1}`,
  revenue: Math.round(40000 + Math.random() * 40000),
  orders: Math.round(80 + Math.random() * 120),
}));

const STATUS_DIST = [
  { name: "Completed",  value: 62, color: "#10B981" },
  { name: "Preparing",  value: 18, color: "#3B82F6" },
  { name: "Pending",    value:  3, color: "#F59E0B" },
  { name: "Cancelled",  value:  5, color: "#EF4444" },
];

const TOP_RESTAURANTS = [
  { name: "Riverside Café",  orders: 1248, revenue: 24860000, growth: "+28%" },
  { name: "Spice Hub",       orders:  986, revenue: 19240000, growth: "+22%" },
  { name: "Tandoor Tales",   orders:  842, revenue: 16830000, growth: "+18%" },
  { name: "Urban Bites",     orders:  756, revenue: 14260000, growth: "+15%" },
  { name: "Café Italiano",   orders:  648, revenue: 12180000, growth: "+12%" },
];

export default function SuperDashboardPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orderCount, setOrderCount]   = useState(0);

  useEffect(() => {
    fetch("/api/super/restaurants")
      .then((r) => r.json())
      .then((d) => setRestaurants(d.restaurants ?? []));
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((d) => setOrderCount((d.orders ?? []).length));
  }, []);

  const activeCount   = restaurants.filter((r) => r.isActive).length;
  const inactiveCount = restaurants.length - activeCount;

  return (
    <div className="p-6 space-y-6">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1736] to-[#13234F] text-white px-6 py-5">
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-blue-500/10" />
        <div className="absolute top-4 right-20 h-20 w-20 rounded-full bg-blue-400/10" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm">{new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })}</p>
            <h1 className="text-2xl font-bold mt-0.5">Welcome Back, Nitin 👋</h1>
            <p className="text-white/70 text-sm mt-1">Here's what's happening across your hospitality platform today.</p>
          </div>
          <Link href="/super/restaurants" className="btn-primary bg-blue-500 text-white text-sm px-4 py-2">
            + Add New Restaurant
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Restaurants", val: restaurants.length || 248, icon: Building2, color: "text-blue-600",  bg: "bg-blue-50",   change: "+12%" },
          { label: "Total Orders",      val: orderCount || 12486,       icon: ShoppingBag,color: "text-green-600", bg: "bg-green-50",  change: "+18%" },
          { label: "Total Revenue",     val: "₹18,42,200",              icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50",  change: "+22%" },
          { label: "Total Customers",   val: 8642,                      icon: Users,      color: "text-purple-600",bg: "bg-purple-50", change: "+16%" },
        ].map((k) => (
          <div key={k.label} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`h-9 w-9 rounded-xl ${k.bg} flex items-center justify-center`}>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" />{k.change} vs last month
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{typeof k.val === "number" ? k.val.toLocaleString("en-IN") : k.val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Revenue Overview</h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-lg px-2.5 py-1">This Month</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="ordG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis yAxisId="left"  tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number, name: string) => [name === "revenue" ? `₹${(v/100).toFixed(0)}` : v, name]} />
              <Area yAxisId="left"  type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#revG)"  name="Revenue" />
              <Area yAxisId="right" type="monotone" dataKey="orders"  stroke="#10B981" strokeWidth={2} fill="url(#ordG)"  name="Orders"  />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Order Status Distribution</h2>
          <div className="relative">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={STATUS_DIST} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" paddingAngle={3}>
                  {STATUS_DIST.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{(orderCount || 12486).toLocaleString("en-IN")}</p>
                <p className="text-xs text-gray-400">Total Orders</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5 mt-2">
            {STATUS_DIST.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-gray-600">{s.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top Performing Restaurants */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <h2 className="font-semibold text-gray-900">Top Performing Restaurants</h2>
            <Link href="/super/restaurants" className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <table className="w-full data-table">
            <thead><tr><th>#</th><th>Restaurant Name</th><th>Total Orders</th><th>Revenue</th><th>Growth</th></tr></thead>
            <tbody>
              {TOP_RESTAURANTS.map((r, i) => (
                <tr key={r.name}>
                  <td className="font-bold text-gray-400">{i === 0 ? "🥇" : i + 1}</td>
                  <td className="font-medium text-gray-900">{r.name}</td>
                  <td className="text-gray-600">{r.orders.toLocaleString("en-IN")}</td>
                  <td className="font-semibold text-gray-900">{formatRupees(r.revenue)}</td>
                  <td><span className="text-xs text-green-600 font-semibold">{r.growth}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Restaurants */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <h2 className="font-semibold text-gray-900">Recent Restaurants</h2>
            <Link href="/super/restaurants" className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-black/5">
            {restaurants.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {r.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-400">/{r.slug}</p>
                  </div>
                </div>
                <span className={`badge ${r.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {r.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
            {restaurants.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-300 text-sm">No restaurants yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Active Restaurants",   val: `${activeCount || 212} (+14%)`, icon: "🏪", color: "bg-blue-50"   },
          { label: "Total Menu Items",      val: "4,182 (+8%)",                  icon: "🍽️", color: "bg-green-50"  },
          { label: "Support Tickets",       val: "48 (−12%)",                    icon: "🎫", color: "bg-orange-50" },
          { label: "Inactive Restaurants",  val: `${inactiveCount || 18} (−5%)`, icon: "⏸️", color: "bg-gray-50"   },
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
