"use client";

import { useEffect, useState } from "react";
import { Plus, Mail, Phone, Trash2, UserCheck, Shield, Users, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

type StaffMember = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: "OWNER" | "STAFF";
  createdAt: string;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "STAFF" as "OWNER" | "STAFF",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff");
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          role: form.role,
          password: form.password.trim() || "Staff@1234",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add staff member");
        return;
      }

      setForm({ name: "", email: "", phone: "", role: "STAFF", password: "" });
      setShowForm(false);
      load();
    } catch {
      setError("Network error while adding staff member.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteStaff(id: string, name: string | null) {
    if (!confirm(`Remove staff access for ${name || "this user"}?`)) return;
    await fetch(`/api/admin/staff?id=${id}`, { method: "DELETE" });
    load();
  }

  if (accessDenied) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 pt-16">
        <div className="h-16 w-16 mx-auto bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Owner Privileges Required</h2>
        <p className="text-sm text-slate-500">
          Staff Management is reserved strictly for restaurant owners and administrators.
        </p>
        <div className="pt-2">
          <a href="/admin/orders" className="btn-primary bg-[#132A1E] text-white py-2.5 px-5 rounded-xl inline-flex text-xs font-bold">
            ← Return to Orders Queue
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#132A1E] to-[#2D5A3D] text-white px-6 py-5 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold font-display">Staff & Access Management 🌿</h1>
            <p className="text-white/70 text-xs mt-0.5">
              Manage authorized captains, kitchen operators, and cashiers for your restaurant.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary bg-white text-[#132A1E] text-xs px-4 py-2 font-bold rounded-xl shadow-md hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Staff Member
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-5 max-w-lg animate-slide-up border border-slate-200">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            Add New Staff Account
          </h2>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={addStaff} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Full Name *</label>
              <input
                className="input"
                placeholder="e.g. Suresh Kumar"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Staff Email *</label>
                <input
                  className="input"
                  type="email"
                  placeholder="staff@restaurant.com"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Phone</label>
                <input
                  className="input"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                >
                  <option value="STAFF">Staff / Captain / Kitchen</option>
                  <option value="OWNER">Co-Owner / Manager</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Initial Password</label>
                <input
                  className="input font-mono"
                  placeholder="Default: Staff@1234"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-primary border border-slate-200 text-slate-600 flex-1 justify-center py-2.5 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary bg-[#132A1E] text-white flex-1 justify-center py-2.5 rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Create Staff Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff table */}
      <div className="card overflow-hidden border border-slate-200">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading staff records...</div>
        ) : staff.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <Users className="h-10 w-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No staff accounts found</p>
            <p className="text-xs text-slate-400">
              Click &quot;Add Staff Member&quot; to provision logins for your team.
            </p>
          </div>
        ) : (
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Added Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {s.name ? s.name[0]?.toUpperCase() : "U"}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">
                          {s.name || "Staff Member"}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-0.5 text-xs text-slate-600">
                      {s.phone && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" /> {s.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 font-mono text-slate-500">
                        <Mail className="h-3 w-3 text-slate-400" /> {s.email}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge text-xs font-bold ${
                        s.role === "OWNER"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {s.role === "OWNER" ? "Owner / Admin" : "Staff"}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-slate-500 font-medium">
                      {formatDate(s.createdAt)}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => deleteStaff(s.id, s.name)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                      title="Remove Staff"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
