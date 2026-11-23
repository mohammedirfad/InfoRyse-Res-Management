"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { formatRupees } from "@/lib/utils";
import { BarChart3 } from "lucide-react";
import { cachedJson } from "@/lib/cachedFetch";

const AnalyticsTrendChart = dynamic(() => import("@/components/AdminAnalyticsCharts").then((module) => module.AdminAnalyticsTrendChart), { ssr: false, loading: () => <div className="h-64 rounded-xl bg-slate-100 animate-pulse" /> });
const AnalyticsPeakChart = dynamic(() => import("@/components/AdminAnalyticsCharts").then((module) => module.AdminAnalyticsPeakChart), { ssr: false, loading: () => <div className="h-56 rounded-xl bg-slate-100 animate-pulse" /> });

type AnalyticsData = {
  orderCount: number;
  revenueCents: number;
  knownCustomers: number;
  daily: { day: string; orders: number; revenueCents: number }[];
  hourly: { hour: number; orders: number }[];
  orderTypes: { orderType: string; orders: number }[];
  topItems: { name: string; quantity: number; revenueCents: number }[];
};

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [billMetrics, setBillMetrics] = useState({ paidTaxCents: 0, paidRevenueCents: 0, paidBillCount: 0 });
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 29); return dateInputValue(d); });
  const [to, setTo] = useState(() => dateInputValue(new Date()));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      cachedJson<{ role?: string }>("admin:/api/admin/me", "/api/admin/me"),
      cachedJson<{ analytics?: AnalyticsData }>(`admin:analytics-summary-v2:${from}:${to}`, `/api/admin/orders?view=analytics&from=${from}&to=${to}`),
      cachedJson<{ analytics?: typeof billMetrics }>(`admin:analytics-bill-summary-v3:${from}:${to}:${paymentMethod}`, `/api/admin/bills?analytics=true&from=${from}&to=${to}&paymentMethod=${encodeURIComponent(paymentMethod)}`, { ttlMs: 30_000 }),
    ])
      .then(([me, orderData, billData]) => {
        if (me.data.role === "STAFF") {
          setAccessDenied(true);
          return;
        }
        setAnalytics(orderData.data.analytics ?? null);
        setBillMetrics(billData.data.analytics ?? { paidTaxCents: 0, paidRevenueCents: 0, paidBillCount: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [from, to, paymentMethod]);

  const topItems = analytics?.topItems ?? [];

  // Real Dynamic Order Types
  const orderTypeData = (analytics?.orderTypes ?? []).map((item) => ({
    name: item.orderType === "TAKEAWAY" ? "Takeaway" : "Dine In",
    value: item.orders,
    color: item.orderType === "TAKEAWAY" ? "#D4A94C" : "#132A1E",
  }));

  // Real Dynamic Peak Hours
  const peakHoursData = useMemo(() => {
    const counts = new Map((analytics?.hourly ?? []).map((item) => [item.hour, item.orders]));
    return Array.from({ length: 16 }, (_, index) => index + 8).map((hr) => {
      const label = hr === 12 ? "12PM" : hr > 12 ? `${hr - 12}PM` : `${hr}AM`;
      return { time: label, orders: counts.get(hr) ?? 0 };
    });
  }, [analytics]);

  const completedOrders = analytics?.orderCount ?? 0;
  const totalRevenue = analytics?.revenueCents ?? 0;
  const paidTax = billMetrics.paidTaxCents;
  const knownCustomers = analytics?.knownCustomers ?? 0;
  const dailyByDate = new Map((analytics?.daily ?? []).map((row) => [row.day.slice(0, 10), row]));
  const dayCount = Math.min(366, Math.max(1, Math.ceil((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000) + 1));
  const rangeTrendData = Array.from({ length: dayCount }, (_, index) => {
    const day = new Date(`${from}T00:00:00`);
    day.setDate(day.getDate() + index);
    const row = dailyByDate.get(dateInputValue(day));
    return { date: `${day.getDate()}/${day.getMonth() + 1}`, sales: Math.round((row?.revenueCents ?? 0) / 100), orders: row?.orders ?? 0 };
  });
  const avgOrderValue = completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;

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
      ) : completedOrders === 0 ? (
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
          <section className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-slate-600">From date<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="input mt-1 w-full" /></label>
            <label className="text-xs font-semibold text-slate-600">To date<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="input mt-1 w-full" /></label>
            <label className="text-xs font-semibold text-slate-600">Payment method · settled bills<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input mt-1 w-full"><option value="all">All methods</option><option value="CASH">Cash</option><option value="UPI">UPI / QR</option><option value="CARD">Card</option><option value="OTHER">Other</option></select></label>
          </section>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatRupees(totalRevenue)}</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">Across orders in the selected dates</p>
            </div>
            <div className="card p-4 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Orders</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{completedOrders}</p>
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
                {topItems[0] ? topItems[0].name : "—"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {topItems[0] ? `${topItems[0].quantity} portions ordered` : "Awaiting orders"}
              </p>
            </div>
            <div className="card p-4 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Settled Bill Revenue</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatRupees(billMetrics.paidRevenueCents)}</p>
              <p className="text-[11px] text-slate-400 mt-1">Paid bills · {paymentMethod === "all" ? "all methods" : paymentMethod}</p>
            </div>
            <div className="card p-4 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Settled Bills</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{billMetrics.paidBillCount}</p>
              <p className="text-[11px] text-slate-400 mt-1">Matching selected method and dates</p>
            </div>
            <div className="card p-4 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Known Customers</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{knownCustomers}</p>
              <p className="text-[11px] text-slate-400 mt-1">Unique phone numbers in range</p>
            </div>
            <div className="card p-4 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tax Collected</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatRupees(paidTax)}</p>
              <p className="text-[11px] text-slate-400 mt-1">From paid bills in range</p>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div className="card p-5 border border-slate-200/80 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sales in Selected Range (₹)
            </h2>
            <div className="h-64">
              <AnalyticsTrendChart data={rangeTrendData} />
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
                <AnalyticsPeakChart data={peakHoursData} />
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
                  {topItems.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="h-6 w-6 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{item.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-slate-900">{formatRupees(item.revenueCents)}</span>
                        <span className="text-[10px] text-slate-400 block">{item.quantity} ordered</span>
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
