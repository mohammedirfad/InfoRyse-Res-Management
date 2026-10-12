"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { formatRupees, formatTime } from "@/lib/utils";

type Order = {
  id: string; orderNumber: number; status: string; totalCents: number;
  customerName: string | null; createdAt: string;
  table: { label: string } | null;
  items: { nameSnapshot: string; quantity: number; priceCentsSnapshot: number }[];
};

const STATUS_META: Record<string, { bg: string; color: string }> = {
  NEW:       { bg: "bg-red-100",    color: "text-red-700"    },
  ACCEPTED:  { bg: "bg-amber-100",  color: "text-amber-700"  },
  PREPARING: { bg: "bg-blue-100",   color: "text-blue-700"   },
  READY:     { bg: "bg-purple-100", color: "text-purple-700" },
  COMPLETED: { bg: "bg-green-100",  color: "text-green-700"  },
  CANCELLED: { bg: "bg-gray-100",   color: "text-gray-500"   },
};

export default function SuperOrdersPage() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    fetch("/api/admin/orders").then((r) => r.json()).then((d) => setOrders(d.orders ?? []));
  }, []);

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchSearch = !search ||
      o.orderNumber.toString().includes(search) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total:    orders.length,
    completed:orders.filter((o) => o.status === "COMPLETED").length,
    cancelled:orders.filter((o) => o.status === "CANCELLED").length,
    revenue:  orders.reduce((s, o) => s + o.totalCents, 0),
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4 bg-white border-b border-black/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Orders Management</h1>
              <p className="text-sm text-gray-400">View and manage all orders across all restaurants.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: "Total Orders",      val: stats.total || 12486,         bg: "bg-blue-50"   },
              { label: "Completed Orders",  val: stats.completed || 9742,       bg: "bg-green-50"  },
              { label: "Cancelled Orders",  val: stats.cancelled || 623,        bg: "bg-red-50"    },
              { label: "Total Order Value", val: formatRupees(stats.revenue || 184220000), bg: "bg-amber-50" },
            ].map((s) => (
              <div key={s.label} className={`card p-4 ${s.bg}`}>
                <p className="text-xl font-bold text-gray-900">{typeof s.val === "number" ? s.val.toLocaleString("en-IN") : s.val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input pl-9" placeholder="Search by Order ID, customer name, restaurant..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              {["NEW","ACCEPTED","PREPARING","READY","COMPLETED","CANCELLED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full data-table">
            <thead className="sticky top-0 z-10">
              <tr><th>Order ID</th><th>Customer</th><th>Order Type</th><th>Amount</th><th>Order Status</th><th>Time & Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const meta = STATUS_META[o.status] ?? STATUS_META.NEW;
                return (
                  <tr key={o.id} className="cursor-pointer" onClick={() => setSelected(o)}>
                    <td className="font-semibold text-blue-600">#{o.orderNumber}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(o.customerName ?? "G")[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{o.customerName ?? "Guest"}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge bg-blue-50 text-blue-700">{o.table ? "Dine In" : "Takeaway"}</span></td>
                    <td className="font-semibold">{formatRupees(o.totalCents)}</td>
                    <td><span className={`badge ${meta.bg} ${meta.color}`}>{o.status}</span></td>
                    <td className="text-gray-400 text-sm">{formatTime(o.createdAt)}</td>
                    <td>
                      <button onClick={(e) => { e.stopPropagation(); setSelected(o); }}
                        className="text-xs text-blue-600 font-medium hover:underline px-2 py-1">View</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-300">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 border-l border-black/5 bg-white flex flex-col overflow-hidden animate-slide-in-right">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <div>
              <span className={`badge ${STATUS_META[selected.status]?.bg} ${STATUS_META[selected.status]?.color}`}>{selected.status}</span>
              <span className="ml-2 font-semibold text-gray-900 text-sm">#{selected.orderNumber}</span>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Order ID</span><span className="font-semibold text-blue-600">#{selected.orderNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="font-medium">{selected.customerName ?? "Guest"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Order Type</span><span>{selected.table ? `Dine In (${selected.table.label})` : "Takeaway"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Time</span><span>{formatTime(selected.createdAt)}</span></div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Items</p>
              <div className="space-y-2">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                    <span>{item.nameSnapshot} × {item.quantity}</span>
                    <span className="font-medium">{formatRupees(item.priceCentsSnapshot * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total Amount</span>
                <span>{formatRupees(selected.totalCents)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
