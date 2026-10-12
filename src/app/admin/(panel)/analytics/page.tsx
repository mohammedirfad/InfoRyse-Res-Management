"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { formatRupees } from "@/lib/utils";

type Order = { id: string; status: string; totalCents: number; createdAt: string; items: { nameSnapshot: string; quantity: number; priceCentsSnapshot: number }[]; table?: { label: string } | null };

const ORDER_TYPE_DATA = [
  { name: "Dine In",   value: 52, color: "#132A1E" },
  { name: "Takeaway",  value: 28, color: "#D4A94C" },
  { name: "Delivery",  value: 15, color: "#C2572B" },
  { name: "Online",    value: 5,  color: "#9CA3AF" },
];

const PEAK_HOURS = [
  { time: "8AM", orders: 12 }, { time: "9AM", orders: 18 }, { time: "10AM", orders: 25 },
  { time: "11AM", orders: 42 }, { time: "12PM", orders: 98 }, { time: "1PM", orders: 145 },
  { time: "2PM", orders: 162 }, { time: "3PM", orders: 78 }, { time: "4PM", orders: 55 },
  { time: "5PM", orders: 88 }, { time: "6PM", orders: 132 }, { time: "7PM", orders: 155 },
  { time: "8PM", orders: 178 }, { time: "9PM", orders: 145 }, { time: "10PM", orders: 92 },
  { time: "11PM", orders: 45 },
];

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  useEffect(() => {
    fetch("/api/admin/orders").then((r) => r.json()).then((d) => setOrders(d.orders ?? []));
  }, []);

  // Build 30-day trend
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const dayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === d.toDateString());
    return { date: label, sales: Math.round(dayOrders.reduce((s, o) => s + o.totalCents, 0) / 100), orders: dayOrders.length };
  });

  // Top items
  const itemMap: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o) => o.items.forEach((i) => {
    if (!itemMap[i.nameSnapshot]) itemMap[i.nameSnapshot] = { count: 0, revenue: 0 };
    itemMap[i.nameSnapshot].count   += i.quantity;
    itemMap[i.nameSnapshot].revenue += i.priceCentsSnapshot * i.quantity;
  }));
  const topItems = Object.entries(itemMap).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  // Popular tables
  const tableMap: Record<string, number> = {};
  orders.filter((o) => o.table).forEach((o) => {
    tableMap[o.table!.label] = (tableMap[o.table!.label] ?? 0) + 1;
  });
  const popularTables = Object.entries(tableMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const totalRevenue = orders.reduce((s, o) => s + o.totalCents, 0);
  const totalOrders  = orders.length;
  const avgOrder     = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const newCustomers = 186;
  const returnCustomers = 368;

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Analytics 🌿</h1>
          <p className="text-sm text-gray-500">Get insights into your business performance and make better decisions.</p>
        </div>
        <div className="flex items-center gap-2">
          {(["today", "week", "month"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-xl px-4 py-1.5 text-sm font-medium capitalize transition-all ${period === p ? "bg-[#132A1E] text-white" : "bg-white border border-black/8 text-gray-600"}`}>
              {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: "Total Orders",      val: totalOrders,              suffix: "",   icon: "🛒", change: "+18%" },
          { label: "Total Sales",       val: formatRupees(totalRevenue), suffix: "", icon: "💰", change: "+22%" },
          { label: "Avg. Order Value",  val: formatRupees(avgOrder),   suffix: "",   icon: "📊", change: "+12%" },
          { label: "New Customers",     val: newCustomers,             suffix: "",   icon: "👥", change: "+28%" },
          { label: "Returning Customers", val: returnCustomers,        suffix: "",   icon: "🔄", change: "+15%" },
        ].map((k) => (
          <div key={k.label} className="card p-4">
            <div className="text-xl mb-1">{k.icon}</div>
            <p className="text-xl font-bold text-gray-900">{k.val}</p>
            <p className="text-xs text-gray-400">{k.label}</p>
            <p className="text-xs text-green-600 mt-1">↑ {k.change} vs last month</p>
          </div>
        ))}
      </div>

      {/* Sales & Orders trend */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Sales & Orders Trend</h2>
            <span className="text-xs text-gray-400">Last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="salesG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#132A1E" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#132A1E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ordersG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#D4A94C" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#D4A94C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis yAxisId="left"  tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Area yAxisId="left"  type="monotone" dataKey="sales"  stroke="#132A1E" strokeWidth={2} fill="url(#salesG)"  name="Sales (₹)" />
              <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#D4A94C" strokeWidth={2} fill="url(#ordersG)" name="Orders" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order type donut */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Order Type Distribution</h2>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={ORDER_TYPE_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {ORDER_TYPE_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {ORDER_TYPE_DATA.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-gray-600">{d.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Top selling */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top Selling Items</h2>
            <button className="text-xs text-[#132A1E] hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {topItems.length > 0 ? topItems.map(([name, data], i) => (
              <div key={name} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                  {["🥇","🥈","🥉","4️⃣","5️⃣"][i]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                  <p className="text-xs text-gray-400">{data.count} orders</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{formatRupees(data.revenue)}</p>
              </div>
            )) : (
              // Placeholder data
              [["Truffle Pasta", 245, 7840000], ["Margherita Pizza", 198, 5940000], ["Paneer Tikka Bowl", 162, 4210000], ["Chicken Biryani", 138, 3860000], ["Cold Coffee", 124, 2480000]].map(([name, cnt, rev], i) => (
                <div key={String(name)} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{String(name)}</p>
                    <p className="text-xs text-gray-400">{cnt} orders</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatRupees(Number(rev))}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Peak ordering hours */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Peak Ordering Hours</h2>
            <span className="text-xs text-green-600 font-medium">2 PM +162 Orders</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={PEAK_HOURS} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="orders" fill="#132A1E" radius={[3, 3, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Popular Tables */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Popular Tables (Dine In)</h2>
            <button className="text-xs text-[#132A1E] hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {(popularTables.length > 0 ? popularTables : [["T4",48],["T6",42],["T2",38],["T1",35],["T8",32]]).map(([label, count], i) => (
              <div key={String(label)} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#132A1E] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{String(label)}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">Table {label}</span>
                    <span className="text-gray-500">{count} orders</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-[#132A1E]" style={{ width: `${Math.round(Number(count) / 48 * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
