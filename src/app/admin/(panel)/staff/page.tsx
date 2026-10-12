"use client";

import { useState } from "react";
import { Plus, Mail, Phone, Trash2, Pencil } from "lucide-react";

const SAMPLE_STAFF = [
  { id: "1", name: "Nitin Kumar",   email: "nitin@riversidecafe.com",  phone: "+91 98765 43210", role: "OWNER", status: "Active", joinedAt: "12 Jan 2024" },
  { id: "2", name: "Priya Sharma",  email: "priya@riversidecafe.com",  phone: "+91 87654 32109", role: "STAFF", status: "Active", joinedAt: "15 Feb 2024" },
  { id: "3", name: "Rahul Verma",   email: "rahul@riversidecafe.com",  phone: "+91 91234 56789", role: "STAFF", status: "Active", joinedAt: "20 Mar 2024" },
];

export default function StaffPage() {
  const [staff, setStaff] = useState(SAMPLE_STAFF);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "STAFF" });

  function addStaff() {
    if (!form.name || !form.email) return;
    setStaff((prev) => [...prev, { ...form, id: Date.now().toString(), status: "Active", joinedAt: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) }]);
    setForm({ name: "", email: "", phone: "", role: "STAFF" });
    setShowForm(false);
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#132A1E] to-[#2D5A3D] text-white px-6 py-5 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display">Staff Management 🌿</h1>
            <p className="text-white/60 text-sm mt-0.5">Manage your restaurant staff and their access.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary bg-white text-[#132A1E] text-sm px-4 py-2 font-semibold">
            <Plus className="h-4 w-4" /> Add Staff
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-5 max-w-lg animate-slide-up">
          <h2 className="font-semibold text-gray-900 mb-4">Add New Staff Member</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name *</label>
              <input className="input" placeholder="Staff member name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Email *</label>
              <input className="input" type="email" placeholder="email@restaurant.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
              <input className="input" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="OWNER">Owner</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="btn-primary border-2 border-black/10 text-gray-600 px-5 py-2 text-sm">Cancel</button>
            <button onClick={addStaff} className="btn-primary bg-[#132A1E] text-white px-5 py-2 text-sm">Add Staff Member</button>
          </div>
        </div>
      )}

      {/* Staff list */}
      <div className="card overflow-hidden">
        <table className="w-full data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#132A1E] to-[#2D5A3D] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{s.name[0]}</div>
                    <span className="font-medium text-gray-900">{s.name}</span>
                  </div>
                </td>
                <td className="text-gray-500">{s.email}</td>
                <td className="text-gray-500">{s.phone}</td>
                <td><span className={`badge ${s.role === "OWNER" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{s.role}</span></td>
                <td><span className="badge bg-green-50 text-green-700">● {s.status}</span></td>
                <td className="text-gray-400">{s.joinedAt}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setStaff((prev) => prev.filter((x) => x.id !== s.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
