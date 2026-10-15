"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { formatRupees } from "@/lib/utils";
import { TrendingUp, ShoppingBag, Clock, DollarSign, Calendar, BarChart3 } from "lucide-react";

type Order = {
  id: string;
  status: string;
  totalCents: number;
  orderType: string | null;
  createdAt: string;
  items: { nameSnapshot: string; quantity: number; priceCentsSnapshot: number }[];
  table?: { label: string } | null;
};

const COLORS = ["#132A1E", "#D4A94C", "#0284C7", "#9333EA", "#E11D48"];

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.role === "STAFF") {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        return fetch("/api/admin/orders")
          .then((r) => r.json())
          .then((data) => setOrders(data.orders ?? []))
          .finally(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, []);

  // Build real dynamic 30-day trend
  const trendData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      const dayOrders = orders.filter(
        (o) => new Date(o.createdAt).toDateString() === d.toDateString() && o.status !== "CANCELLED"
      );
      return {
        date: label,
        sales: Math.round(dayOrders.reduce((s, o) => s + o.totalCents, 0) / 100),
        orders: dayOrders.length,
      };
    });
  }, [orders]);

  // Real Dynamic Top Items
  const topItems = useMemo(() => {
    const itemMap: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      if (o.status !== "CANCELLED") {
        o.items.forEach((i) => {
          if (!itemMap[i.nameSnapshot]) itemMap[i.nameSnapshot] = { count: 0, revenue: 0 };
          itemMap[i.nameSnapshot].count += i.quantity;
          itemMap[i.nameSnapshot].revenue += i.priceCentsSnapshot * i.quantity;
        });
      }
    });
    return Object.entries(itemMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  }, [orders]);

  // Real Dynamic Order Types
  const orderTypeData = useMemo(() => {
    const counts: Record<string, number> = { "Dine In": 0, "Takeaway": 0 };
    orders.forEach((o) => {
      if (o.status !== "CANCELLED") {
        if (o.orderType === "TAKEAWAY") counts["Takeaway"]++;
        else counts["Dine In"]++;
      }
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return [
      { name: "Dine In", value: counts["Dine In"], color: "#132A1E" },
      { name: "Takeaway", value: counts["Takeaway"], color: "#D4A94C" },
    ].filter((x) => x.value > 0);
  }, [orders]);

  // Real Dynamic Peak Hours
  const peakHoursData = useMemo(() => {
    const hourMap: Record<number, number> = {};
    for (let h = 8; h <= 23; h++) hourMap[h] = 0;
    orders.forEach((o) => {
      if (o.status !== "CANCELLED") {
        const h = new Date(o.createdAt).getHours();
        if (hourMap[h] !== undefined) hourMap[h]++;
      }
    });
    return Object.entries(hourMap).map(([h, count]) => {
      const hr = Number(h);
      const label = hr === 12 ? "12PM" : hr > 12 ? `${hr - 12}PM` : `${hr}AM`;
      return { time: label, orders: count };
    });
  }, [orders]);

  const completedOrders = orders.filter((o) => o.status !== "CANCELLED");
  const totalRevenue = completedOrders.reduce((s, o) => s + o.totalCents, 0);
  const avgOrderValue = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

  if (accessDenied) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 pt-16">
        <div className="h-16 w-16 mx-auto bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center">
          <BarChart3 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Owner Access Required</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Business analytics and revenue reports are reserved for restaurant owners and managers.
        </p>
        <a
          href="/admin/orders"
          className="inline-block mt-2 px-5 py-2.5 bg-[#132A1E] text-white rounded-xl text-sm font-semibold hover:bg-[#1a3828] transition-colors"
        >
          Return to Orders
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#132A1E] to-[#2D5A3D] text-white px-6 py-5 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold font-display">Sales & Performance Analytics 🌿</h1>
            <p className="text-white/70 text-xs mt-0.5">
              Live operational metrics calculated directly from your order ledger.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">Loading metrics...</div>
      ) : orders.length === 0 ? (
        /* Clean empty state for new restaurants */
        <div className="card p-16 text-center text-slate-400 space-y-3 border border-slate-200">
          <BarChart3 className="h-12 w-12 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">No Orders Recorded Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Your sales trends, peak dining hours, and top-selling dishes will generate automatically once diners begin placing orders.
          </p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatRupees(totalRevenue)}</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">Live settled & active</p>
            </div>
            <div className="card p-4 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Orders</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{completedOrders.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">Non-cancelled orders</p>
            </div>
            <div className="card p-4 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Avg. Order Value</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatRupees(avgOrderValue)}</p>
              <p className="text-[11px] text-slate-400 mt-1">Per transaction average</p>
            </div>
            <div className="card p-4 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Top Dish Sold</span>
              <p className="text-lg font-bold text-slate-900 truncate mt-1">
                {topItems[0] ? topItems[0][0] : "—"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {topItems[0] ? `${topItems[0][1].count} portions ordered` : "Awaiting orders"}
              </p>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div className="card p-5 border border-slate-200/80 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              30-Day Sales Velocity (₹)
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#132A1E" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#132A1E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} />
                  <Tooltip
                    formatter={(val: any) => [`₹${val}`, "Revenue"]}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#132A1E" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Peak Hours */}
            <div className="card p-5 border border-slate-200/80 space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Orders by Dining Hour (Kitchen Traffic)
              </h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHoursData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "10px" }} />
                    <Bar dataKey="orders" fill="#132A1E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Items List */}
            <div className="card p-5 border border-slate-200/80 space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Top Selling Menu Items
              </h2>
              {topItems.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">No dish sales recorded yet</p>
              ) : (
                <div className="space-y-2.5">
                  {topItems.map(([name, data], idx) => (
                    <div key={name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="h-6 w-6 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-slate-900">{formatRupees(data.revenue)}</span>
                        <span className="text-[10px] text-slate-400 block">{data.count} ordered</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
