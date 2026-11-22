"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  trend: { date: string; sales: number; orders: number }[];
  peakHours: { time: string; orders: number }[];
};

export function AdminAnalyticsTrendChart({ data }: { data: Props["trend"] }) {
  return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data}>
    <defs><linearGradient id="analyticsSalesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#132A1E" stopOpacity={0.25} /><stop offset="95%" stopColor="#132A1E" stopOpacity={0} /></linearGradient></defs>
    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} /><YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} />
    <Tooltip formatter={(value: number) => [`₹${value}`, "Revenue"]} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
    <Area type="monotone" dataKey="sales" stroke="#132A1E" strokeWidth={2} fillOpacity={1} fill="url(#analyticsSalesGradient)" />
  </AreaChart></ResponsiveContainer>;
}

export function AdminAnalyticsPeakChart({ data }: { data: Props["peakHours"] }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
    <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} /><YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} />
    <Tooltip contentStyle={{ borderRadius: "10px" }} /><Bar dataKey="orders" fill="#132A1E" radius={[4, 4, 0, 0]} />
  </BarChart></ResponsiveContainer>;
}
