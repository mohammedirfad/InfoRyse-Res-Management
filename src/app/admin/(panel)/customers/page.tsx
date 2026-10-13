"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  X,
  Phone,
  Mail,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  Receipt,
  UserCheck,
  Crown,
  Sparkles,
  RefreshCw,
  UtensilsCrossed,
  ArrowUpDown,
} from "lucide-react";
import { formatRupees, formatDate, formatTime } from "@/lib/utils";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  lastVisit: string;
  firstVisit: string;
  tables: string[];
  status: "NEW" | "REPEAT" | "VIP";
  recentOrders: Array<{
    id: string;
    orderNumber: number;
    totalCents: number;
    status: string;
    createdAt: string;
    tableLabel: string;
    items: Array<{ name: string; quantity: number; price: number }>;
  }>;
};

const STATUS_META: Record<string, { label: string; bg: string; color: string; icon: any }> = {
  NEW:    { label: "New",    bg: "bg-blue-50 border-blue-200",   color: "text-blue-700",   icon: UserCheck },
  REPEAT: { label: "Repeat", bg: "bg-emerald-50 border-emerald-200", color: "text-emerald-700", icon: Sparkles },
  VIP:    { label: "VIP",    bg: "bg-amber-50 border-amber-200",   color: "text-amber-800",   icon: Crown },
};

export default function CustomersPage() {
  const [customers, setCustomers]         = useState<Customer[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<"all" | "NEW" | "REPEAT" | "VIP">("all");
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [totalCount, setTotalCount]       = useState(0);
  const [selected, setSelected]           = useState<Customer | null>(null);
  const [stats, setStats]                 = useState({
    totalCustomers: 0,
    totalSpent: 0,
    newCount: 0,
    repeatCount: 0,
    vipCount: 0,
  });

  const fetchCustomers = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: targetPage.toString(),
        limit: "10",
        search,
      });

      const res = await fetch(`/api/admin/customers?${query.toString()}`, { cache: "no-store" });
      const data = await res.json();

      let list: Customer[] = data.customers ?? [];
      if (statusFilter !== "all") {
        list = list.filter((c) => c.status === statusFilter);
      }

      setCustomers(list);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalCount(data.pagination?.total ?? list.length);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchCustomers(page);
  }, [fetchCustomers, page]);

  // Export full customer data to CSV
  async function exportToCSV() {
    try {
      const res = await fetch("/api/admin/customers?export=true", { cache: "no-store" });
      const data = await res.json();
      const all: Customer[] = data.customers ?? [];

      const headers = ["Name", "Phone", "Email", "Total Orders", "Total Spent (INR)", "Segment", "Last Visit", "Tables"];
      const rows = all.map((c) => [
        `"${c.name}"`,
        `"${c.phone || "-"}"`,
        `"${c.email || "-"}"`,
        c.orderCount,
        (c.totalSpent / 100).toFixed(2),
        c.status,
        new Date(c.lastVisit).toLocaleDateString("en-IN"),
        `"${c.tables.join(", ") || "-"}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `restaurant_customers_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export customers:", err);
    }
  }

  // Print customer report table
  function printCustomers() {
    const win = window.open("", "_blank", "width=800,height=700");
    if (!win) return;

    win.document.write(`<!DOCTYPE html><html><head>
      <title>Customer Directory & Order Summary</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; padding:24px; color:#111; font-size:12px; }
        h1 { font-size:18px; font-weight:bold; margin-bottom:4px; }
        p { color:#666; font-size:11px; margin-bottom:16px; }
        table { width:100%; border-collapse:collapse; margin-top:8px; }
        th, td { border:1px solid #ddd; padding:8px 10px; text-align:left; font-size:11px; }
        th { background:#f5f5f5; font-weight:bold; }
        .amt { text-align:right; font-weight:bold; }
        .badge { display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold; background:#eee; }
      </style></head><body>
      <h1>Customer Directory Report</h1>
      <p>Generated on ${new Date().toLocaleString("en-IN")} · Total Customers: ${totalCount}</p>
      <table>
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Phone / Contact</th>
            <th>Orders</th>
            <th class="amt">Total Paid</th>
            <th>Segment</th>
            <th>Last Visit</th>
            <th>Tables Dined</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map((c) => `
            <tr>
              <td><b>${c.name}</b></td>
              <td>${c.phone || c.email || "—"}</td>
              <td>${c.orderCount}</td>
              <td class="amt">₹${(c.totalSpent / 100).toFixed(0)}</td>
              <td><span class="badge">${c.status}</span></td>
              <td>${new Date(c.lastVisit).toLocaleDateString("en-IN")}</td>
              <td>${c.tables.join(", ") || "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header banner */}
        <div className="bg-gradient-to-r from-[#132A1E] via-[#1a3828] to-[#132A1E] text-white px-6 py-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Customer Directory</h1>
                <span className="text-xs bg-white/20 text-white font-extrabold px-2.5 py-0.5 rounded-full">
                  {totalCount} Total
                </span>
              </div>
              <p className="text-white/60 text-xs mt-0.5">
                Detailed customer order history, visit frequency, and lifetime spending
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={printCustomers}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all active:scale-95 shadow-xs"
              >
                <Printer className="h-4 w-4" /> Print Report
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95 shadow-md"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {[
              { label: "Total Customers", val: stats.totalCustomers, bg: "bg-white", border: "border-gray-200", icon: "👥", color: "text-gray-900" },
              { label: "New Guests",       val: stats.newCount,       bg: "bg-blue-50/50", border: "border-blue-100", icon: "⭐", color: "text-blue-700" },
              { label: "Repeat Diners",    val: stats.repeatCount,    bg: "bg-emerald-50/50", border: "border-emerald-100", icon: "🔄", color: "text-emerald-700" },
              { label: "VIP Patrons",      val: stats.vipCount,       bg: "bg-amber-50/50", border: "border-amber-100", icon: "👑", color: "text-amber-800" },
            ].map((s) => (
              <div key={s.label} className={`p-4 rounded-2xl border ${s.bg} ${s.border} shadow-xs`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search & Segment Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name, phone, email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-gray-50 text-xs pl-9 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-2.5 text-gray-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Segment Chips */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
              {(["all", "VIP", "REPEAT", "NEW"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === s
                      ? "bg-[#132A1E] text-white shadow-xs"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  {s === "all" ? "All Customers" : s}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Table (10 per page) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3.5">Customer Name</th>
                    <th className="px-4 py-3.5">Contact Details</th>
                    <th className="px-4 py-3.5 text-center">Orders Placed</th>
                    <th className="px-4 py-3.5 text-right">Total Amount Paid</th>
                    <th className="px-4 py-3.5">Customer Segment</th>
                    <th className="px-4 py-3.5">Last Visit</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="h-6 w-6 border-2 border-[#132A1E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-gray-400 font-semibold">Loading customers…</p>
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <UtensilsCrossed className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-gray-700">No customers found</p>
                        <p className="text-xs text-gray-400 mt-1">
                          When guests order dishes via table QR, their profiles appear here automatically.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => {
                      const meta = STATUS_META[c.status] ?? STATUS_META.NEW;
                      const MetaIcon = meta.icon;

                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelected(c)}
                          className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                {c.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                  {c.name}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  Tables: {c.tables.length > 0 ? c.tables.join(", ") : "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="space-y-0.5">
                              {c.phone ? (
                                <p className="font-medium text-gray-800 flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-gray-400" /> {c.phone}
                                </p>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                              {c.email && (
                                <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                  <Mail className="w-3 h-3 text-gray-400" /> {c.email}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-center font-bold text-gray-900">
                            <span className="inline-block bg-gray-100 px-2 py-0.5 rounded-md">
                              {c.orderCount}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right font-black text-gray-900 text-sm">
                            {formatRupees(c.totalSpent)}
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${meta.bg} ${meta.color}`}
                            >
                              <MetaIcon className="w-3 h-3" />
                              {meta.label}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-gray-500 font-medium">
                            {formatDate(c.lastVisit)}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(c);
                              }}
                              className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                            >
                              View History →
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls: 10 at a time */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <p className="text-xs text-gray-500 font-medium">
                Showing <b className="text-gray-900">{customers.length}</b> of{" "}
                <b className="text-gray-900">{totalCount}</b> customers (Page {page} of {totalPages})
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                  .map((pNum) => (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`h-7 w-7 text-xs font-bold rounded-lg transition-all ${
                        page === pNum
                          ? "bg-[#132A1E] text-white shadow-xs"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Slide-Over Drawer: Customer Detail & Orders History ─────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[#132A1E] text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                  {selected.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{selected.name}</h3>
                  <p className="text-xs text-gray-400">
                    Customer ID: {selected.phone || selected.id.slice(0, 12)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Profile Card */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Total Spent</span>
                  <span className="font-extrabold text-emerald-800 text-sm">
                    {formatRupees(selected.totalSpent)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Orders Count</span>
                  <span className="font-bold text-gray-900">{selected.orderCount} orders</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">First Visit</span>
                  <span className="font-medium text-gray-700">{formatDate(selected.firstVisit)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Last Visit</span>
                  <span className="font-medium text-gray-700">{formatDate(selected.lastVisit)}</span>
                </div>
              </div>

              {/* Order History */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                  Recent Orders History
                </h4>

                {selected.recentOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No recent order details available</p>
                ) : (
                  selected.recentOrders.map((o) => (
                    <div key={o.id} className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/70 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900">
                          Order #{o.orderNumber} {o.tableLabel ? `· Table ${o.tableLabel}` : ""}
                        </span>
                        <span className="font-extrabold text-emerald-700">
                          {formatRupees(o.totalCents)}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {formatDate(o.createdAt)} at {formatTime(o.createdAt)}
                      </div>
                      <div className="border-t border-gray-200/60 pt-2 space-y-1">
                        {o.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-600">
                            <span>{item.quantity}× {item.name}</span>
                            <span className="font-medium">{formatRupees(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setSelected(null)}
                className="w-full bg-[#132A1E] text-white py-2.5 rounded-xl font-bold text-xs"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
