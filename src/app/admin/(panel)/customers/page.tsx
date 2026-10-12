"use client";

import { useEffect, useState } from "react";
import { Search, X, Phone, MessageSquare, Plus } from "lucide-react";
import { formatRupees, formatDate } from "@/lib/utils";

type Customer = {
  id: string; name: string; phone: string; orderCount: number;
  totalSpent: number; lastVisit: string; status: "NEW" | "REPEAT" | "VIP" | "INACTIVE";
};

type OrderHistory = {
  id: string; orderNumber: number; totalCents: number; status: string; createdAt: string;
  items: { nameSnapshot: string; quantity: number }[];
};

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  NEW:      { label: "New",      bg: "bg-blue-50",   color: "text-blue-700"   },
  REPEAT:   { label: "Repeat",   bg: "bg-green-50",  color: "text-green-700"  },
  VIP:      { label: "VIP",      bg: "bg-amber-50",  color: "text-amber-700"  },
  INACTIVE: { label: "Inactive", bg: "bg-gray-50",   color: "text-gray-500"   },
};

const SAMPLE_CUSTOMERS: Customer[] = [
  { id: "1", name: "Rahul Sharma",   phone: "+91 98765 43210", orderCount: 18, totalSpent: 742000, lastVisit: "2026-10-06", status: "VIP"      },
  { id: "2", name: "Priya Nair",     phone: "+91 87654 32109", orderCount: 12, totalSpent: 528000, lastVisit: "2026-10-05", status: "REPEAT"   },
  { id: "3", name: "Amit Kulkarni",  phone: "+91 91234 56789", orderCount: 6,  totalSpent: 214000, lastVisit: "2026-10-04", status: "REPEAT"   },
  { id: "4", name: "Sneha Reddy",    phone: "+91 91234 56789", orderCount: 3,  totalSpent: 126000, lastVisit: "2026-10-03", status: "NEW"      },
  { id: "5", name: "Vikram Mehta",   phone: "+91 99123 44556", orderCount: 24, totalSpent: 986000, lastVisit: "2026-10-07", status: "VIP"      },
  { id: "6", name: "Anonya Das",     phone: "+91 83776 55443", orderCount: 5,  totalSpent: 232000, lastVisit: "2026-09-28", status: "REPEAT"   },
  { id: "7", name: "Karan Singh",    phone: "+91 99987 77665", orderCount: 2,  totalSpent: 84000,  lastVisit: "2026-09-15", status: "INACTIVE" },
  { id: "8", name: "Meera Iyer",     phone: "+91 99876 55432", orderCount: 11, totalSpent: 496000, lastVisit: "2026-10-06", status: "REPEAT"   },
];

export default function CustomersPage() {
  const [search, setSearch]       = useState("");
  const [tab, setTab]             = useState("all");
  const [selected, setSelected]   = useState<Customer | null>(null);
  const [orders, setOrders]       = useState<OrderHistory[]>([]);

  useEffect(() => {
    if (selected) {
      fetch("/api/admin/orders")
        .then((r) => r.json())
        .then((d) => setOrders((d.orders ?? []).slice(0, 4)));
    }
  }, [selected]);

  const filtered = SAMPLE_CUSTOMERS.filter((c) => {
    const matchTab = tab === "all" || c.status.toLowerCase() === tab;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    return matchTab && matchSearch;
  });

  const stats = {
    total:    SAMPLE_CUSTOMERS.length,
    newCount: SAMPLE_CUSTOMERS.filter((c) => c.status === "NEW").length,
    repeat:   SAMPLE_CUSTOMERS.filter((c) => c.status === "REPEAT").length,
    vip:      SAMPLE_CUSTOMERS.filter((c) => c.status === "VIP").length,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#132A1E] to-[#2D5A3D] text-white px-6 py-5">
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display">Customers 🌿</h1>
              <p className="text-white/60 text-sm mt-0.5">Build strong relationships with your customers. Know them better, serve them better.</p>
            </div>
            <button className="btn-primary bg-white text-[#132A1E] text-sm px-4 py-2 font-semibold">
              <Plus className="h-4 w-4" /> Add Customer
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Customers", val: stats.total,    bg: "bg-gray-50",   icon: "👥" },
              { label: "New Customers",   val: stats.newCount, bg: "bg-blue-50",   icon: "⭐" },
              { label: "Repeat Customers",val: stats.repeat,   bg: "bg-green-50",  icon: "🔄" },
              { label: "VIP Customers",   val: stats.vip,      bg: "bg-amber-50",  icon: "👑" },
            ].map((s) => (
              <div key={s.label} className={`card p-4 ${s.bg}`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <p className="text-2xl font-bold text-gray-900">{s.val}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs + search */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1.5">
              {[["all","All Customers"], ["new","New"], ["repeat","Repeat"], ["vip","VIP"], ["inactive","Inactive"]].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-all ${tab === id ? "bg-[#132A1E] text-white" : "bg-white border border-black/8 text-gray-600"}`}>
                  {label}
                  <span className={`ml-1 text-xs rounded-full px-1.5 ${tab === id ? "bg-white/20" : "bg-gray-100 text-gray-400"}`}>
                    {id === "all" ? stats.total : SAMPLE_CUSTOMERS.filter((c) => c.status.toLowerCase() === id).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input pl-9 w-64" placeholder="Search by name, mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden flex-1">
            <table className="w-full data-table">
              <thead>
                <tr><th>Customer</th><th>Contact</th><th>Total Orders</th><th>Total Spent</th><th>Last Visit</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const meta = STATUS_META[c.status];
                  return (
                    <tr key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#132A1E] to-[#2D5A3D] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {c.name[0]}
                          </div>
                          <span className="font-medium text-gray-900">{c.name}</span>
                        </div>
                      </td>
                      <td className="text-gray-500 text-sm">{c.phone}</td>
                      <td className="font-medium">{c.orderCount}</td>
                      <td className="font-semibold text-gray-900">{formatRupees(c.totalSpent)}</td>
                      <td className="text-gray-500">{formatDate(c.lastVisit)}</td>
                      <td><span className={`badge ${meta.bg} ${meta.color}`}>● {meta.label}</span></td>
                      <td>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-green-600"><Phone className="h-3.5 w-3.5" /></button>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600"><MessageSquare className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 border-l border-black/5 bg-white flex flex-col overflow-hidden animate-slide-in-right">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <h2 className="font-semibold text-gray-900">Customer Details</h2>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center py-2">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#132A1E] to-[#2D5A3D] flex items-center justify-center text-white text-2xl font-bold mb-3">
                {selected.name[0]}
              </div>
              <p className="font-semibold text-gray-900 text-lg">{selected.name}</p>
              <span className={`badge mt-1 ${STATUS_META[selected.status].bg} ${STATUS_META[selected.status].color}`}>
                {selected.status === "VIP" ? "👑 " : ""}{STATUS_META[selected.status].label}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-lg font-bold text-gray-900">{selected.orderCount}</p>
                <p className="text-xs text-gray-400">Orders</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm font-bold text-gray-900">{formatRupees(selected.totalSpent)}</p>
                <p className="text-xs text-gray-400">Total Spent</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm font-bold text-gray-900">{formatRupees(Math.round(selected.totalSpent / selected.orderCount))}</p>
                <p className="text-xs text-gray-400">Avg. Order</p>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Information</p>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Phone className="h-4 w-4 text-gray-400" />
                {selected.phone}
              </div>
              <div className="text-sm text-gray-500">Last Visit: {formatDate(selected.lastVisit)}</div>
            </div>

            {/* Order history */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order History</p>
                <button className="text-xs text-[#132A1E] hover:underline">View All</button>
              </div>
              <div className="space-y-2">
                {orders.slice(0, 3).map((o) => (
                  <div key={o.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="h-8 w-8 rounded-xl bg-[#132A1E]/10 flex items-center justify-center text-sm flex-shrink-0">🍽️</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900">#{o.orderNumber}</p>
                      <p className="text-xs text-gray-400 truncate">{o.items.map((i) => i.nameSnapshot).join(", ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900">{formatRupees(o.totalCents)}</p>
                      <span className="text-[10px] text-green-600 font-medium">✓ {o.status}</span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No orders yet</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button className="flex flex-col items-center gap-1 rounded-xl border border-black/8 p-3 hover:bg-gray-50 text-gray-600 transition-colors text-xs">
                <MessageSquare className="h-4 w-4" />Send Offer
              </button>
              <button className="flex flex-col items-center gap-1 rounded-xl border border-black/8 p-3 hover:bg-gray-50 text-gray-600 transition-colors text-xs">
                <Phone className="h-4 w-4" />Call
              </button>
              <button className="flex flex-col items-center gap-1 rounded-xl border border-black/8 p-3 hover:bg-gray-50 text-gray-600 transition-colors text-xs">
                <Plus className="h-4 w-4" />Add Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
