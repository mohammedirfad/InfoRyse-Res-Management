"use client";

import { useEffect, useState } from "react";
import { Search, X, Users, Mail, Phone, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type UserRecord = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: "SUPER_ADMIN" | "OWNER" | "STAFF";
  restaurantId: string | null;
  restaurant?: { id: string; name: string; slug: string; isActive: boolean } | null;
  createdAt: string;
};

const ROLE_META: Record<string, { bg: string; color: string; label: string }> = {
  SUPER_ADMIN: { bg: "bg-purple-100", color: "text-purple-800", label: "Super Admin" },
  OWNER:       { bg: "bg-blue-100",   color: "text-blue-800",   label: "Restaurant Owner" },
  STAFF:       { bg: "bg-emerald-100",  color: "text-emerald-800",  label: "Restaurant Staff" },
};

export default function SuperUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<UserRecord | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/super/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const displayUsers = users.filter((u) => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const query = search.toLowerCase();
    const matchSearch =
      !search ||
      (u.name && u.name.toLowerCase().includes(query)) ||
      u.email.toLowerCase().includes(query) ||
      (u.restaurant?.name && u.restaurant.name.toLowerCase().includes(query));
    return matchRole && matchSearch;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">User Accounts Directory</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                All platform administrators, restaurant partners, and staff members registered in the system.
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input pl-10 text-xs bg-slate-50 border-slate-200"
              placeholder="Search by name, email, restaurant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filters and Table */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-2 p-4 bg-white/60 border-b border-slate-200">
            {[
              { id: "all", label: "All Roles", cnt: users.length },
              { id: "SUPER_ADMIN", label: "Super Admins", cnt: users.filter((u) => u.role === "SUPER_ADMIN").length },
              { id: "OWNER", label: "Owners", cnt: users.filter((u) => u.role === "OWNER").length },
              { id: "STAFF", label: "Staff", cnt: users.filter((u) => u.role === "STAFF").length },
            ].map(({ id, label, cnt }) => (
              <button
                key={id}
                onClick={() => setRoleFilter(id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  roleFilter === id
                    ? "bg-[#0B1736] text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label} <span className="ml-1 opacity-70">({cnt})</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400">Loading user accounts...</div>
          ) : (
            <table className="w-full data-table">
              <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm">
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Assigned Restaurant</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {displayUsers.map((u, i) => {
                  const meta = ROLE_META[u.role] ?? ROLE_META.STAFF;
                  return (
                    <tr
                      key={u.id}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                      onClick={() => setSelected(u)}
                    >
                      <td className="text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {u.name ? u.name[0]?.toUpperCase() : u.email[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{u.name || "User"}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${meta.bg} ${meta.color} text-xs font-bold`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="text-slate-600 text-xs font-mono">{u.email}</td>
                      <td className="text-slate-500 text-xs font-mono">{u.phone || "—"}</td>
                      <td>
                        {u.restaurant ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{u.restaurant.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              (/{u.restaurant.slug})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                            Platform Admin
                          </span>
                        )}
                      </td>
                      <td className="text-slate-400 text-xs">{formatDate(u.createdAt)}</td>
                    </tr>
                  );
                })}
                {displayUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      No matching users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* User detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden animate-slide-in-right shadow-xl">
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <h2 className="font-bold text-slate-900">User Details</h2>
            <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 space-y-4 text-xs">
            <div className="text-center pb-3 border-b border-slate-100">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-2xl mb-2 shadow-sm">
                {selected.name ? selected.name[0]?.toUpperCase() : selected.email[0]?.toUpperCase()}
              </div>
              <p className="font-bold text-slate-900 text-sm">{selected.name || "User"}</p>
              <p className="font-mono text-slate-400 text-xs">{selected.email}</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Role</span>
                <span className="font-bold text-slate-800">{selected.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone</span>
                <span className="font-mono text-slate-800">{selected.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Restaurant</span>
                <span className="font-semibold text-slate-800">{selected.restaurant?.name || "Global Platform"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Registered</span>
                <span className="text-slate-700">{formatDate(selected.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
