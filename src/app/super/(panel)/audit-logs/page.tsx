"use client";

import { useState } from "react";
import { Search, Download, X } from "lucide-react";

const LOGS = [
  { id: "1",  date: "31 Dec 2024, 12:45 PM", user: "Nitin",        role: "Super Admin",      action: "Login",   module: "Authentication", details: "User logged in to admin panel",     ip: "49.207.12.45",  status: "Success" },
  { id: "2",  date: "31 Dec 2024, 11:32 AM", user: "Rahul Sharma", role: "Restaurant Owner", action: "Update",  module: "Restaurant",     details: "Updated menu item 'Paneer Pizza'", ip: "103.52.14.21", status: "Success" },
  { id: "3",  date: "31 Dec 2024, 11:15 AM", user: "Priya Mehta",  role: "Customer",         action: "Place Order",module: "Orders",       details: "Order #ORD1256 placed",            ip: "157.48.67.12", status: "Success" },
  { id: "4",  date: "30 Dec 2024, 09:48 AM", user: "Suresh Kumar", role: "Driver",           action: "Update",  module: "Delivery",       details: "Marked order #ORD1256 as delivered",ip: "49.205.33.18", status: "Success" },
  { id: "5",  date: "30 Dec 2024, 08:30 PM", user: "Amit Verma",   role: "Admin Staff",      action: "Create",  module: "Offer",           details: "Created new offer 'FLAT20'",       ip: "103.52.14.21", status: "Success" },
  { id: "6",  date: "30 Dec 2024, 07:22 PM", user: "Neha Patel",   role: "Customer",         action: "Payment", module: "Payments",       details: "Payment successful (Order #ORD1255)",ip: "157.48.67.12",status: "Success" },
  { id: "7",  date: "30 Dec 2024, 06:18 PM", user: "Anjali Singh", role: "Restaurant Staff", action: "Delete",  module: "Menu",           details: "Deleted menu item 'Old Burger'",   ip: "103.52.14.21", status: "Success" },
  { id: "8",  date: "30 Dec 2024, 04:30 PM", user: "Nitin",        role: "Super Admin",      action: "Update",  module: "Settings",       details: "Updated payment gateway settings", ip: "49.207.12.45",  status: "Success" },
  { id: "9",  date: "30 Dec 2024, 03:15 PM", user: "System",       role: "System",           action: "Auto",    module: "Security",       details: "Multiple failed login attempts",   ip: "203.14.25.67", status: "Warning" },
  { id: "10", date: "30 Dec 2024, 03:20 PM", user: "Mohammed Ali", role: "Restaurant Owner", action: "Update",  module: "Restaurant",     details: "Updated business hours",           ip: "103.52.14.21", status: "Success" },
];

const ROLE_COLORS: Record<string, string> = {
  "Super Admin":      "bg-purple-50 text-purple-700",
  "Restaurant Owner": "bg-blue-50 text-blue-700",
  "Admin Staff":      "bg-green-50 text-green-700",
  "Restaurant Staff": "bg-teal-50 text-teal-700",
  "Customer":         "bg-gray-50 text-gray-600",
  "Driver":           "bg-orange-50 text-orange-700",
  "System":           "bg-slate-50 text-slate-600",
};

const ACTION_COLORS: Record<string, string> = {
  Login:        "bg-blue-50 text-blue-700",
  Update:       "bg-amber-50 text-amber-700",
  Create:       "bg-green-50 text-green-700",
  Delete:       "bg-red-50 text-red-600",
  Payment:      "bg-purple-50 text-purple-700",
  "Place Order":"bg-teal-50 text-teal-700",
  Auto:         "bg-slate-50 text-slate-600",
};

export default function AuditLogsPage() {
  const [search, setSearch]     = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [selected, setSelected] = useState<(typeof LOGS)[0] | null>(null);

  const filtered = LOGS.filter((l) => {
    const matchModule = moduleFilter === "all" || l.module.toLowerCase() === moduleFilter;
    const matchSearch = !search || l.user.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase()) || l.details.toLowerCase().includes(search.toLowerCase());
    return matchModule && matchSearch;
  });

  const stats = {
    total:     LOGS.length,
    adminActs: LOGS.filter((l) => l.role === "Super Admin").length,
    restActs:  LOGS.filter((l) => l.role === "Restaurant Owner" || l.role === "Restaurant Staff").length,
    security:  LOGS.filter((l) => l.module === "Security").length,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4 bg-white border-b border-black/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Audit Logs</h1>
              <p className="text-sm text-gray-400">Track and monitor all important activities performed on the platform for security, accountability and compliance.</p>
            </div>
            <button className="btn-primary border border-black/10 text-gray-600 text-sm px-4 py-2">
              <Download className="h-4 w-4" /> Export Logs
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            {[
              { label: "Total Logs",        val: "12,486", icon: "📋", bg: "bg-blue-50",   change: "+18%" },
              { label: "Admin Actions",     val: "1,248",  icon: "🛡️", bg: "bg-purple-50", change: "+12%" },
              { label: "Restaurant Actions",val: "4,286",  icon: "🏪", bg: "bg-green-50",  change: "+22%" },
              { label: "User Actions",      val: "5,842",  icon: "👤", bg: "bg-amber-50",  change: "+16%" },
              { label: "Security Events",   val: "1,110",  icon: "⚠️", bg: "bg-red-50",    change: "+8%"  },
            ].map((s) => (
              <div key={s.label} className={`card p-3 ${s.bg}`}>
                <div className="text-lg mb-1">{s.icon}</div>
                <p className="text-lg font-bold text-gray-900">{s.val}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xs text-green-600 mt-0.5">{s.change}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input pl-9" placeholder="Search by user, action, module, restaurant or reference ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input w-40" onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="all">All Modules</option>
              {["authentication","restaurant","orders","payments","menu","offer","settings","security","delivery"].map((m) => (
                <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
            <select className="input w-36">
              <option>All Actions</option>
              <option>Login</option>
              <option>Create</option>
              <option>Update</option>
              <option>Delete</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full data-table">
            <thead className="sticky top-0 z-10">
              <tr><th>Date & Time</th><th>User</th><th>Role</th><th>Action</th><th>Module</th><th>Details</th><th>IP Address</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="cursor-pointer" onClick={() => setSelected(l)}>
                  <td className="text-gray-500 text-xs whitespace-nowrap">{l.date}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{l.user[0]}</div>
                      <span className="text-sm font-medium text-gray-900">{l.user}</span>
                    </div>
                  </td>
                  <td><span className={`badge text-xs ${ROLE_COLORS[l.role] ?? "bg-gray-50 text-gray-600"}`}>{l.role}</span></td>
                  <td><span className={`badge text-xs ${ACTION_COLORS[l.action] ?? "bg-gray-50 text-gray-600"}`}>{l.action}</span></td>
                  <td className="text-gray-500 text-sm">{l.module}</td>
                  <td className="text-gray-600 text-sm max-w-[200px] truncate">{l.details}</td>
                  <td className="text-gray-400 text-xs font-mono">{l.ip}</td>
                  <td>
                    <span className={`badge text-xs ${l.status === "Success" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {l.status === "Success" ? "✓" : "⚠"} {l.status}
                    </span>
                  </td>
                  <td>
                    <button onClick={(e) => { e.stopPropagation(); setSelected(l); }} className="text-xs text-blue-600 hover:underline font-medium px-2 py-1">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 text-xs text-gray-400 border-t border-black/5">
            Showing 1 to {filtered.length} of {LOGS.length} logs
          </div>
        </div>
      </div>

      {/* Log detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 border-l border-black/5 bg-white flex flex-col overflow-hidden animate-slide-in-right">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <div className="flex items-center gap-2">
              <span className={`badge text-xs ${selected.status === "Success" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {selected.status}
              </span>
              <span className="text-sm font-medium text-gray-600">User {selected.action}</span>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="border-b border-black/5 pb-3">
              <div className="flex gap-2 mb-2">
                <button className="text-sm font-medium text-[#0B1736] border-b-2 border-[#0B1736] pb-1">Details</button>
                <button className="text-sm text-gray-400 pb-1">Raw Data</button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5 text-sm">
              {[
                { label: "User",        val: selected.user        },
                { label: "Role",        val: selected.role        },
                { label: "Action",      val: selected.action      },
                { label: "Module",      val: selected.module      },
                { label: "Description", val: selected.details     },
                { label: "IP Address",  val: selected.ip          },
                { label: "Status",      val: selected.status      },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
                  <span className="text-gray-700 font-medium">: {val}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5 text-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Session Information</p>
              {[
                { label: "Session ID",    val: "ad9f3c2e5-7f04-4e2d-9f1a..." },
                { label: "Login Method",  val: "Email & Password"            },
                { label: "Date & Time",   val: selected.date                 },
                { label: "Device",        val: "Windows (Chrome)"            },
                { label: "Login Duration",val: "2 hours 15 minutes"          },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-gray-400 w-28 flex-shrink-0 text-xs">{label}</span>
                  <span className="text-gray-700 text-xs">: {val}</span>
                </div>
              ))}
            </div>
            <button className="w-full btn-primary border-2 border-red-100 text-red-500 justify-center py-2.5 rounded-xl text-sm hover:bg-red-50">
              Invalidate Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
