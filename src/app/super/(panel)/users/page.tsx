"use client";

import { useEffect, useState } from "react";
import { Search, X, Users, Mail, Phone, Building2, ChevronLeft, ChevronRight } from "lucide-react";
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

type UsersPayload = { users: UserRecord[]; pagination: { page: number; total: number; totalPages: number }; roleCounts: Record<string, number> };
const usersPageCache = new Map<string, UsersPayload>();

export default function SuperUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<UserRecord | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "30", role: roleFilter, search: search.trim() });
    const key = params.toString();
    const cached = usersPageCache.get(key);
    if (cached) {
      setUsers(cached.users);
      setPagination(cached.pagination);
      setRoleCounts(cached.roleCounts);
    } else {
      setUsers([]);
      setLoading(true);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/super/users?${key}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Unable to load user accounts.");
          usersPageCache.set(key, data);
          setUsers(data.users ?? []);
          setPagination(data.pagination ?? { page, total: 0, totalPages: 1 });
          setRoleCounts(data.roleCounts ?? {});
          setSelected((current) => current ? (data.users ?? []).find((user: UserRecord) => user.id === current.id) ?? null : null);
        })
        .catch((error) => { if (error.name !== "AbortError") console.error("User accounts load failed", error); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, search ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, roleFilter, search]);

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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Filters and Table */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-2 p-4 bg-white/60 border-b border-slate-200">
            {[
              { id: "all", label: "All Roles", cnt: Object.values(roleCounts).reduce((sum, value) => sum + value, 0) },
              { id: "SUPER_ADMIN", label: "Super Admins", cnt: roleCounts.SUPER_ADMIN ?? 0 },
              { id: "OWNER", label: "Owners", cnt: roleCounts.OWNER ?? 0 },
              { id: "STAFF", label: "Staff", cnt: roleCounts.STAFF ?? 0 },
            ].map(({ id, label, cnt }) => (
              <button
                key={id}
                onClick={() => { setRoleFilter(id); setPage(1); }}
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
                {users.map((u, i) => {
                  const meta = ROLE_META[u.role] ?? ROLE_META.STAFF;
                  return (
                    <tr
                      key={u.id}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                      onClick={() => setSelected(u)}
                    >
                      <td className="text-slate-400 font-mono text-xs">{(page - 1) * 30 + i + 1}</td>
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
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      No matching users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <span>{pagination.total.toLocaleString("en-IN")} accounts · Page {page} of {pagination.totalPages}{loading ? " · Refreshing…" : ""}</span>
            <div className="flex gap-2"><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button aria-label="Next page" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>
          </div>
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
