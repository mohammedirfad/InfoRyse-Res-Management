"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Building2, ShoppingBag, Users, Utensils } from "lucide-react";
import { formatRupees } from "@/lib/utils";

type DashboardData = {
  stats: { restaurants: number; activeRestaurants: number; pausedRestaurants: number; users: number; activeTables: number; orders: number; paidRevenueCents: number };
  daily: { day: string; orders: number; paidCents: number }[];
  generatedAt: string;
};
type Restaurant = { id: string; name: string; slug: string; isActive: boolean; _count?: { orders: number; tables: number } };

export default function SuperDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all([fetch("/api/super/dashboard", { cache: "no-store" }), fetch("/api/super/restaurants", { cache: "no-store" })])
      .then(async ([statsResponse, restaurantsResponse]) => {
        if (!statsResponse.ok || !restaurantsResponse.ok) throw new Error("Could not load platform data. Please sign in again or retry.");
        const [stats, partnerData] = await Promise.all([statsResponse.json(), restaurantsResponse.json()]);
        if (live) { setData(stats); setRestaurants(partnerData.restaurants ?? []); }
      })
      .catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "Could not load platform data."); });
    return () => { live = false; };
  }, []);

  const stats = data?.stats;
  const topRestaurants = [...restaurants].sort((a, b) => (b._count?.orders ?? 0) - (a._count?.orders ?? 0)).slice(0, 5);
  const cards = [
    { label: "Restaurants", value: stats?.restaurants, note: `${stats?.activeRestaurants ?? 0} active`, icon: Building2, color: "text-blue-700 bg-blue-50" },
    { label: "Orders", value: stats?.orders, note: "All time", icon: ShoppingBag, color: "text-emerald-700 bg-emerald-50" },
    { label: "Paid revenue", value: stats ? formatRupees(stats.paidRevenueCents) : undefined, note: "Recorded paid bills", icon: Utensils, color: "text-amber-700 bg-amber-50" },
    { label: "User accounts", value: stats?.users, note: `${stats?.activeTables ?? 0} active tables`, icon: Users, color: "text-violet-700 bg-violet-50" },
  ];

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#0B1736] to-[#13234F] px-5 py-5 text-white sm:px-6">
        <div><p className="text-xs text-white/60">Platform overview · {data ? new Date(data.generatedAt).toLocaleString("en-IN") : "Loading current data"}</p><h1 className="mt-1 text-xl font-bold sm:text-2xl">Super Admin Dashboard</h1><p className="mt-1 text-sm text-white/70">Live totals and activity read from your restaurant data.</p></div>
        <Link href="/super/restaurants" className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold hover:bg-blue-400">Add restaurant</Link>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon, color }) => <article key={label} className="card min-w-0 p-4 sm:p-5"><div className="flex items-center justify-between"><span className={`rounded-xl p-2 ${color}`}><Icon className="h-5 w-5" /></span><span className="truncate text-xs text-slate-500">{note}</span></div><p className="mt-4 break-words text-2xl font-bold text-slate-900">{value === undefined ? "—" : typeof value === "number" ? value.toLocaleString("en-IN") : value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></article>)}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="card min-w-0 p-4 sm:p-5"><div className="mb-4"><h2 className="font-semibold text-slate-900">Orders per day</h2><p className="text-xs text-slate-500">Actual order records · last 30 days</p></div><div className="h-64 w-full">{data && <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.daily}><defs><linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickFormatter={(value) => value.slice(5)} tick={{ fontSize: 10 }} minTickGap={24} /><YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} /><Tooltip labelFormatter={(value) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN")} /><Area type="monotone" dataKey="orders" stroke="#2563eb" fill="url(#ordersFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer>}</div></article>
        <article className="card min-w-0 p-4 sm:p-5"><div className="mb-4"><h2 className="font-semibold text-slate-900">Paid revenue per day</h2><p className="text-xs text-slate-500">Paid bill records · last 30 days</p></div><div className="h-64 w-full">{data && <ResponsiveContainer width="100%" height="100%"><BarChart data={data.daily}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickFormatter={(value) => value.slice(5)} tick={{ fontSize: 10 }} minTickGap={24} /><YAxis width={52} tick={{ fontSize: 10 }} tickFormatter={(value) => `₹${Math.round(value / 100)}`} /><Tooltip labelFormatter={(value) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN")} formatter={(value) => [formatRupees(Number(value)), "Paid"]} /><Bar dataKey="paidCents" fill="#059669" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>}</div></article>
      </section>

      <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4 sm:p-5"><div><h2 className="font-semibold text-slate-900">Restaurants by order volume</h2><p className="text-xs text-slate-500">Counts from recorded orders</p></div><Link href="/super/restaurants" className="flex items-center gap-1 text-sm font-semibold text-blue-700">Manage <ArrowRight className="h-4 w-4" /></Link></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="px-4 py-3">Restaurant</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Tables</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{topRestaurants.map((restaurant) => <tr key={restaurant.id}><td className="px-4 py-3"><p className="font-medium text-slate-900">{restaurant.name}</p><p className="text-xs text-slate-500">/{restaurant.slug}</p></td><td className="px-4 py-3">{(restaurant._count?.orders ?? 0).toLocaleString("en-IN")}</td><td className="px-4 py-3">{(restaurant._count?.tables ?? 0).toLocaleString("en-IN")}</td><td className="px-4 py-3">{restaurant.isActive ? "Active" : "Paused"}</td></tr>)}{!restaurants.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No restaurant records found.</td></tr>}</tbody></table></div></section>
    </div>
  );
}
