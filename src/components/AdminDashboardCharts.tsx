"use client";

import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  hourlyData: { time: string; sales: number }[];
  statusDistribution: { name: string; value: number; color: string }[];
};

export default function AdminDashboardCharts({ hourlyData, statusDistribution }: Props) {
  return <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
    <div className="card p-5 xl:col-span-2">
      <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-gray-900">Today's Sales Overview</h2><span className="text-xs text-gray-400">Today</span></div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={hourlyData}>
          <defs><linearGradient id="dashboardSalesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#132A1E" stopOpacity={0.2} /><stop offset="95%" stopColor="#132A1E" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
          <Tooltip formatter={(value: number) => [`₹${value}`, "Sales"]} />
          <Area type="monotone" dataKey="sales" stroke="#132A1E" strokeWidth={2} fill="url(#dashboardSalesGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <div className="card p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Order Status</h2>
      {statusDistribution.length ? <>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart><Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>{statusDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value: number, name: string) => [value, name]} /></PieChart>
        </ResponsiveContainer>
        <div className="space-y-1 mt-2">{statusDistribution.map((status) => <div key={status.name} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{ background: status.color }} /><span className="text-gray-600 capitalize">{status.name.toLowerCase()}</span></div><span className="font-medium text-gray-900">{status.value}</span></div>)}</div>
      </> : <div className="flex flex-col items-center justify-center h-40 text-gray-300"><p className="text-sm">No orders yet today</p></div>}
    </div>
  </div>;
}
