"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import {
  ShoppingBag, TrendingUp, Clock, CheckCircle, Plus, LayoutGrid, QrCode, BarChart2, ArrowRight
} from "lucide-react";
import { formatRupees } from "@/lib/utils";

type Order = {
  id: string; status: string; totalCents: number; orderNumber: number;
  createdAt: string; table?: { label: string } | null; customerName?: string | null;
  items: { nameSnapshot: string; quantity: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "#EF4444", ACCEPTED: "#F59E0B", PREPARING: "#3B82F6",
  READY: "#8B5CF6", COMPLETED: "#10B981", CANCELLED: "#9CA3AF",
};

const QUICK_ACTIONS = [
  { href: "/admin/menu",   label: "Add Menu Item",    icon: Plus,        color: "bg-green-50 text-green-700 border-green-200" },
  { href: "/admin/menu",   label: "Manage Categories",icon: LayoutGrid,  color: "bg-blue-50 text-blue-700 border-blue-200" },
  { href: "/admin/offers", label: "Create Offer",     icon: TrendingUp,  color: "bg-amber-50 text-amber-700 border-amber-200" },
  { href: "/admin/tables", label: "Generate QR",      icon: QrCode,      color: "bg-purple-50 text-purple-700 border-purple-200" },
  { href: "/admin/tables", label: "Manage Tables",    icon: LayoutGrid,  color: "bg-pink-50 text-pink-700 border-pink-200" },
  { href: "/admin/analytics", label: "View Reports",  icon: BarChart2,   color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
];

function buildHourlySales(orders: Order[]) {
  const map: Record<number, number> = {};
  for (let h = 8; h <= 22; h++) map[h] = 0;
  orders.forEach((o) => {
    const h = new Date(o.createdAt).getHours();
    if (h >= 8 && h <= 22) map[h] = (map[h] ?? 0) + o.totalCents;
  });
  return Object.entries(map).map(([h, v]) => ({
    time: `${h}:00`,
    sales: Math.round(v / 100),
  }));
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantName, setRestaurantName] = useState("Your Restaurant");

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []));
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setRestaurantName(d.restaurant?.name ?? "Your Restaurant"));
  }, []);

  const today = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString()
  );

  const pending   = today.filter((o) => ["NEW", "ACCEPTED"].includes(o.status));
  const preparing = today.filter((o) => o.status === "PREPARING");
  const completed = today.filter((o) => o.status === "COMPLETED");
  const salesCents = today.reduce((s, o) => s + o.totalCents, 0);

  const statusDistribution = Object.entries(
    today.reduce((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] ?? "#9CA3AF" }));

  const hourlyData = buildHourlySales(today);

  // Top selling dishes
  const itemCounts: Record<string, number> = {};
  orders.forEach((o) => o.items.forEach((i) => {
    itemCounts[i.nameSnapshot] = (itemCounts[i.nameSnapshot] ?? 0) + i.quantity;
  }));
  const topDishes = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#132A1E] to-[#1C3C29] text-white px-6 py-5">
        <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute top-3 right-20 h-16 w-16 rounded-full bg-[#D4A94C]/10" />
        <div className="relative">
          <p className="text-white/60 text-sm">Tuesday · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          <h1 className="text-2xl font-display mt-0.5">{greeting}! 👋</h1>
          <p className="text-white/70 text-sm mt-1">Here's what's happening at {restaurantName} today.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: today.length, icon: ShoppingBag, color: "text-[#132A1E]", bg: "bg-[#132A1E]/10", change: "+12% vs yesterday" },
          { label: "Total Sales", value: formatRupees(salesCents), icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", change: "+18% vs yesterday" },
          { label: "Pending Orders", value: pending.length, icon: Clock, color: "text-orange-600", bg: "bg-orange-50", change: `${pending.length} awaiting` },
          { label: "Completed", value: completed.length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", change: `${preparing.length} preparing` },
        ].map((c) => (
          <div key={c.label} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`h-9 w-9 rounded-xl ${c.bg} flex items-center justify-center`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
            <p className="text-xs text-green-600 mt-1">{c.change}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Sales chart */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Today's Sales Overview</h2>
            <span className="text-xs text-gray-400">Today</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#132A1E" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#132A1E" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v: number) => [`₹${v}`, "Sales"]} />
              <Area type="monotone" dataKey="sales" stroke="#132A1E" strokeWidth={2} fill="url(#salesGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Donut */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Order Status</h2>
          {statusDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {statusDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [v, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {statusDistribution.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-gray-600 capitalize">{s.name.toLowerCase()}</span>
                    </div>
                    <span className="font-medium text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
              <ShoppingBag className="h-10 w-10 mb-2" />
              <p className="text-sm">No orders yet today</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-[#132A1E] font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-black/5">
            {orders.slice(0, 6).map((o) => (
              <div key={o.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-sm text-gray-900">#{o.orderNumber}</p>
                  <p className="text-xs text-gray-400">
                    {o.table ? `Table ${o.table.label}` : "Takeaway"}
                    {o.customerName ? ` · ${o.customerName}` : ""}
                  </p>
                </div>
                <span className="badge" style={{ background: STATUS_COLORS[o.status] + "20", color: STATUS_COLORS[o.status] }}>
                  {o.status}
                </span>
                <span className="text-sm font-semibold text-gray-900">{formatRupees(o.totalCents)}</span>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="px-5 py-10 text-center text-gray-300">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No orders yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Top selling + Quick actions */}
        <div className="space-y-4">
          {/* Top Selling */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Top Selling Dishes</h2>
              <Link href="/admin/menu" className="text-xs text-[#132A1E] hover:underline">View All →</Link>
            </div>
            {topDishes.length > 0 ? (
              <div className="space-y-2.5">
                {topDishes.map(([name, count], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 ${i === 0 ? "text-[#D4A94C]" : "text-gray-400"}`}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-400">{count} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No sales data yet</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACTIONS.slice(0, 6).map((a) => (
                <Link
                  key={a.href + a.label}
                  href={a.href}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 border text-center hover:opacity-80 transition-opacity ${a.color}`}
                >
                  <a.icon className="h-4 w-4" />
                  <span className="text-[10px] font-medium leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
