"use client";

import { useEffect, useState } from "react";
import { Search, X, Plus } from "lucide-react";

type User = { id: string; email: string; role: string; restaurantId: string | null; createdAt?: string };

const ROLE_META: Record<string, { bg: string; color: string; label: string }> = {
  SUPER_ADMIN: { bg: "bg-purple-50", color: "text-purple-700", label: "Super Admin"       },
  OWNER:       { bg: "bg-blue-50",   color: "text-blue-700",   label: "Restaurant Owner"  },
  STAFF:       { bg: "bg-green-50",  color: "text-green-700",  label: "Restaurant Staff"  },
};

const MOCK_USERS = [
  { id: "1", name: "Nitin (Super Admin)", email: "superadmin@inforyse.com", role: "SUPER_ADMIN", restaurantId: null, phone: "+91 98765 43210", status: "Active", joined: "01 Jan 2024" },
  { id: "2", name: "Rahul Sharma",  email: "owner@riversidecafe.com",  role: "OWNER", restaurantId: "r1", phone: "+91 87654 32109", status: "Active",   joined: "12 Jan 2024" },
  { id: "3", name: "Priya Nair",    email: "staff@riversidecafe.com",  role: "STAFF", restaurantId: "r1", phone: "+91 91234 56789", status: "Active",   joined: "15 Feb 2024" },
  { id: "4", name: "Amit Verma",    email: "owner@spicehub.com",       role: "OWNER", restaurantId: "r2", phone: "+91 99887 66554", status: "Active",   joined: "28 Jan 2024" },
  { id: "5", name: "Sneha Reddy",   email: "owner@urbanbites.com",     role: "OWNER", restaurantId: "r3", phone: "+91 77665 44332", status: "Active",   joined: "22 Feb 2024" },
  { id: "6", name: "Karan Singh",   email: "staff@spicehub.com",       role: "STAFF", restaurantId: "r2", phone: "+91 99987 77665", status: "Inactive", joined: "18 Nov 2023" },
];

export default function SuperUsersPage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<(typeof MOCK_USERS)[0] | null>(null);

  useEffect(() => {
    // In production, fetch from /api/super/users
    // For now, use mock data
    setUsers([]);
  }, []);

  const displayUsers = MOCK_USERS.filter((u) => {
    const matchRole   = roleFilter === "all" || u.role === roleFilter;
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search);
    return matchRole && matchSearch;
  });

  const stats = {
    total:  MOCK_USERS.length,
    owners: MOCK_USERS.filter((u) => u.role === "OWNER").length,
    staff:  MOCK_USERS.filter((u) => u.role === "STAFF").length,
    admins: MOCK_USERS.filter((u) => u.role === "SUPER_ADMIN").length,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-4 bg-white border-b border-black/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-400">Manage all platform users including super admins, restaurant owners, staff and customers.</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary border border-black/10 text-gray-600 text-sm px-4 py-2">↓ Export</button>
              <button className="btn-primary bg-[#0B1736] text-white text-sm px-4 py-2">
                <Plus className="h-4 w-4" /> Add New User
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: "Total Users",       val: 2486,        icon: "👥", bg: "bg-blue-50"   },
              { label: "Restaurant Users",  val: 342,         icon: "🏪", bg: "bg-green-50"  },
              { label: "Admins & Staff",    val: 24,          icon: "🛡️", bg: "bg-purple-50" },
              { label: "Inactive Users",    val: 421,         icon: "⏸️", bg: "bg-gray-50"   },
            ].map((s) => (
              <div key={s.label} className={`card p-4 ${s.bg}`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <p className="text-xl font-bold text-gray-900">{s.val.toLocaleString("en-IN")}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="input pl-9" placeholder="Search by name, email, phone or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input w-48" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="OWNER">Restaurant Owner</option>
              <option value="STAFF">Restaurant Staff</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Role tabs */}
          <div className="flex gap-1.5 px-4 pt-4 pb-2">
            {[["all","All Users",2486],["OWNER","Restaurant Users",342],["STAFF","Drivers",156],["SUPER_ADMIN","Admins & Staff",24]].map(([id,label,cnt]) => (
              <button key={id} onClick={() => setRoleFilter(String(id))}
                className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-all ${roleFilter === id ? "bg-[#0B1736] text-white" : "bg-white border border-black/8 text-gray-600"}`}>
                {String(label)} <span className="ml-1 text-xs opacity-60">{String(cnt)}</span>
              </button>
            ))}
          </div>

          <table className="w-full data-table">
            <thead className="sticky top-0 z-10">
              <tr><th>#</th><th>User</th><th>Role</th><th>Phone</th><th>Email</th><th>Restaurant/Assigned To</th><th>Status</th><th>Joined On</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {displayUsers.map((u, i) => {
                const meta = ROLE_META[u.role] ?? ROLE_META.STAFF;
                return (
                  <tr key={u.id} className="cursor-pointer" onClick={() => setSelected(u)}>
                    <td className="text-gray-400 font-medium">{i + 1}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{u.name[0]}</div>
                        <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                      </div>
                    </td>
                    <td><span className={`badge ${meta.bg} ${meta.color} text-xs`}>{meta.label}</span></td>
                    <td className="text-gray-500 text-sm">{u.phone}</td>
                    <td className="text-gray-500 text-sm">{u.email}</td>
                    <td className="text-gray-400 text-sm">{u.restaurantId ? "Riverside Café" : "—"}</td>
                    <td><span className={`badge ${u.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>● {u.status}</span></td>
                    <td className="text-gray-400 text-sm">{u.joined}</td>
                    <td>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelected(u)} className="text-xs text-blue-600 font-medium hover:underline px-2 py-1">View</button>
                        <button className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">Deactivate</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 border-l border-black/5 bg-white flex flex-col overflow-hidden animate-slide-in-right">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <h2 className="font-semibold text-gray-900">User Details</h2>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold mb-3">{selected.name[0]}</div>
              <p className="font-bold text-gray-900">{selected.name}</p>
              <span className={`badge mt-1 ${ROLE_META[selected.role]?.bg} ${ROLE_META[selected.role]?.color}`}>{ROLE_META[selected.role]?.label}</span>
              <span className={`badge mt-1 ${selected.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>● {selected.status}</span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profile</p>
              <div className="flex justify-between"><span className="text-gray-500">Full Name</span><span className="font-medium">{selected.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="text-gray-700 text-xs">{selected.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{selected.phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">User Type</span><span>{ROLE_META[selected.role]?.label}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-green-600 font-medium">{selected.status}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Joined On</span><span>{selected.joined}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary border border-black/10 text-gray-600 justify-center py-2.5 rounded-xl text-sm">Edit User</button>
              <button className="btn-primary border border-red-100 text-red-500 justify-center py-2.5 rounded-xl text-sm hover:bg-red-50">Deactivate</button>
            </div>
            <button className="w-full btn-primary border border-amber-100 text-amber-600 justify-center py-2.5 rounded-xl text-sm hover:bg-amber-50">Reset Password</button>
          </div>
        </div>
      )}
    </div>
  );
}
