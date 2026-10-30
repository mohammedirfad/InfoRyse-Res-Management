"use client";

import { useEffect, useState } from "react";
import {
  Plus, Search, Filter, X, ExternalLink, ShieldAlert,
  Mail, Phone, MapPin, Building, Copy, Check, Send, Edit3,
  Ban, CheckCircle2, Lock, UserCheck, AlertTriangle
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  ownerName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  location: string | null;
  plan: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { orders: number; tables: number };
  users?: { id: string; email: string; name: string | null; phone: string | null }[];
};

type CreatedCredentials = {
  restaurant: Restaurant;
  credentials: {
    email: string;
    loginUrl: string;
    emailSent: boolean;
  };
};

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add Restaurant Form
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    location: "",
    plan: "Pro" as "Basic" | "Pro" | "Premium" | "Enterprise",
  });

  // Created credentials modal
  const [createdInfo, setCreatedInfo] = useState<CreatedCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Selected restaurant drawer
  const [selected, setSelected] = useState<Restaurant | null>(null);

  // Send Email modal
  const [emailModalResto, setEmailModalResto] = useState<Restaurant | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailCategory, setEmailCategory] = useState("Official Notice");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Edit Owner Details modal
  const [editResto, setEditResto] = useState<Restaurant | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    ownerName: "",
    contactEmail: "",
    contactPhone: "",
    location: "",
    plan: "Pro",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/super/restaurants");
      const data = await res.json();
      setRestaurants(data.restaurants ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  // Add Restaurant with deep client-side validation
  async function handleCreateRestaurant(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (formData.name.trim().length < 2) {
      setFormError("Restaurant name must be at least 2 characters.");
      return;
    }
    if (formData.ownerName.trim().length < 2) {
      setFormError("Owner name must be at least 2 characters.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.ownerEmail.trim())) {
      setFormError("Please enter a valid owner email address.");
      return;
    }
    if (formData.location.trim().length < 2) {
      setFormError("Please enter the restaurant's location/city.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/super/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          ownerName: formData.ownerName.trim(),
          ownerEmail: formData.ownerEmail.trim().toLowerCase(),
          ownerPhone: formData.ownerPhone.trim(),
          location: formData.location.trim(),
          plan: formData.plan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create restaurant");
        setSubmitting(false);
        return;
      }

      setCreatedInfo(data);
      setShowForm(false);
      setFormData({
        name: "",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        location: "",
        plan: "Pro",
      });
      load();
    } catch {
      setFormError("An unexpected network error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Toggle active / suspend restaurant
  async function toggleStatus(r: Restaurant) {
    const action = r.isActive ? "Block / Suspend" : "Unblock / Reactivate";
    if (!confirm(`Are you sure you want to ${action} ${r.name}?`)) return;

    await fetch(`/api/super/restaurants/${r.id}/toggle-active`, { method: "POST" });
    if (selected?.id === r.id) {
      setSelected({ ...selected, isActive: !selected.isActive });
    }
    load();
  }


  async function sendAccessReset(r: Restaurant) {
    const res = await fetch(`/api/super/restaurants/${r.id}/reset-access`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Could not send a password reset email.");
      return;
    }
    alert(`Password reset instructions sent to ${data.email}. No password was displayed.`);
  }

  // Open email modal
  function openEmailModal(r: Restaurant) {
    setEmailModalResto(r);
    setEmailSubject(`Important Notice: ${r.name} Account Operations`);
    setEmailCategory("Platform Notice");
    setEmailMessage(
      `Hello ${r.ownerName || "Partner"},\n\nWe are contacting you regarding your InfoRyse restaurant operations for ${r.name}.\n\nPlease ensure your digital menu and tables are up-to-date.\n\nBest regards,\nInfoRyse Platform Administration`
    );
    setEmailSuccess(null);
    setEmailError(null);
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailModalResto) return;
    setSendingEmail(true);
    setEmailError(null);
    setEmailSuccess(null);

    try {
      const res = await fetch(`/api/super/restaurants/${emailModalResto.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: emailSubject,
          message: emailMessage,
          category: emailCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Failed to dispatch email");
        return;
      }
      if (data.success !== true) {
        setEmailError(data.error || "The email provider did not confirm delivery.");
        return;
      }
      setEmailSuccess(`Email provider accepted the message for ${data.sentTo}`);
      setTimeout(() => {
        setEmailModalResto(null);
        setEmailSuccess(null);
      }, 1800);
    } catch {
      setEmailError("Network error while dispatching email.");
    } finally {
      setSendingEmail(false);
    }
  }

  // Open Edit Owner Modal
  function openEditModal(r: Restaurant) {
    setEditResto(r);
    setEditData({
      name: r.name,
      ownerName: r.ownerName || r.users?.[0]?.name || "",
      contactEmail: r.contactEmail || r.users?.[0]?.email || "",
      contactPhone: r.contactPhone || r.users?.[0]?.phone || "",
      location: r.location || "",
      plan: r.plan || "Pro",
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editResto) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/super/restaurants/${editResto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setEditResto(null);
        load();
      }
    } finally {
      setSavingEdit(false);
    }
  }

  const filtered = restaurants.filter((r) => {
    const query = search.toLowerCase();
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(query) ||
      r.slug.toLowerCase().includes(query) ||
      (r.ownerName && r.ownerName.toLowerCase().includes(query)) ||
      (r.contactEmail && r.contactEmail.toLowerCase().includes(query)) ||
      (r.location && r.location.toLowerCase().includes(query));

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && r.isActive) ||
      (statusFilter === "inactive" && !r.isActive);

    return matchSearch && matchStatus;
  });

  const stats = {
    total: restaurants.length,
    active: restaurants.filter((r) => r.isActive).length,
    suspended: restaurants.filter((r) => !r.isActive).length,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>Restaurant Partners & Operations</span>
                <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                  Super Admin
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Onboard restaurants, provide their shared admin login URL, send secure access resets, and manage partner accounts.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary bg-[#0B1736] hover:bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add New Restaurant
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Restaurants</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-green-50/60 border border-green-200/80 rounded-2xl p-4">
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Active & Operating</span>
              <p className="text-2xl font-bold text-green-900 mt-1">{stats.active}</p>
            </div>
            <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-4">
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Suspended / Blocked</span>
              <p className="text-2xl font-bold text-red-900 mt-1">{stats.suspended}</p>
            </div>
          </div>

          {/* Search & Filter bar */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="input pl-10 bg-slate-50 border-slate-200"
                placeholder="Search by restaurant name, owner, email, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-40 bg-slate-50 border-slate-200 font-medium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status ({restaurants.length})</option>
              <option value="active">Active Only ({stats.active})</option>
              <option value="inactive">Suspended ({stats.suspended})</option>
            </select>
            {(search || statusFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Restaurants Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading restaurant registry...</div>
          ) : (
            <table className="w-full data-table">
              <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm">
                <tr>
                  <th>#</th>
                  <th>Restaurant</th>
                  <th>Owner Contact</th>
                  <th>Location</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Tables</th>
                  <th>Orders</th>
                  <th>Registered</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const ownerName = r.ownerName || r.users?.[0]?.name || "Not Specified";
                  const ownerEmail = r.contactEmail || r.users?.[0]?.email || "—";
                  const phone = r.contactPhone || r.users?.[0]?.phone;

                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                      onClick={() => setSelected(r)}
                    >
                      <td className="font-mono text-xs text-slate-400">{i + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-blue-950 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                            {r.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight">{r.name}</p>
                            <p className="text-xs font-mono text-slate-400">/{r.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-sm font-semibold text-slate-800">{ownerName}</p>
                        <p className="text-xs text-slate-500 font-mono">{ownerEmail}</p>
                        {phone && <p className="text-[11px] text-slate-400">{phone}</p>}
                      </td>
                      <td>
                        <span className="text-xs text-slate-600 font-medium">
                          {r.location || "Bengaluru, KA"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-xs font-bold ${
                          r.plan === "Enterprise"
                            ? "bg-purple-100 text-purple-800"
                            : r.plan === "Premium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {r.plan || "Pro"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-xs font-semibold ${
                          r.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-700"
                        }`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${r.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {r.isActive ? "Active" : "Blocked"}
                        </span>
                      </td>
                      <td className="font-semibold text-slate-700 text-sm">{r._count?.tables ?? 0}</td>
                      <td className="font-semibold text-slate-700 text-sm">{r._count?.orders ?? 0}</td>
                      <td className="text-xs text-slate-400">{formatDate(r.createdAt)}</td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => sendAccessReset(r)}
                            title="Send secure owner password reset email"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                          >
                            <Lock className="h-4 w-4" />
                          </button>
                          <a
                            href="/admin/login"
                            onClick={(event) => event.stopPropagation()}
                            title="Restaurant Admin login"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => openEmailModal(r)}
                            title="Send Direct Email to Owner"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(r)}
                            title="Edit Restaurant & Owner Details"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-300 transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleStatus(r)}
                            title={r.isActive ? "Block Restaurant" : "Unblock Restaurant"}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              r.isActive
                                ? "border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                                : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            }`}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-slate-400">
                      No matching restaurants found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Add Restaurant Modal ────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#0B1736] to-slate-800 p-6 text-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Register New Restaurant Partner</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Full details will be validated before provisioning tenant & credentials email.
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-white/10 text-white/70">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRestaurant} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Restaurant Name *
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Royal Bengal Grill"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Slug will be auto-generated uniquely (e.g. <code>/r/royal-bengal-grill</code>).
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Owner Full Name *
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Vikram Malhotra"
                    required
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Owner Official Email *
                  </label>
                  <input
                    className="input"
                    type="email"
                    placeholder="owner@restaurant.com"
                    required
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Contact Phone (10 digits)
                  </label>
                  <input
                    className="input"
                    placeholder="9876543210"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Location / City *
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Indiranagar, Bengaluru"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Subscription Tier
                  </label>
                  <select
                    className="input"
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                  >
                    <option value="Basic">Basic Plan</option>
                    <option value="Pro">Pro Plan</option>
                    <option value="Premium">Premium Plan</option>
                    <option value="Enterprise">Enterprise Plan</option>
                  </select>
                </div>

              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-blue-600" /> Automated Onboarding Workflow:
                </p>
                <p className="text-blue-800 leading-relaxed">
                  1. A tenant and secure owner account are created.<br />
                  2. Login instructions are sent to the owner's email.<br />
                  3. The owner changes the one-time password on first sign-in. Use the reset action if access is lost.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-primary border border-slate-200 text-slate-700 flex-1 justify-center py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary bg-[#0B1736] hover:bg-slate-900 text-white flex-1 justify-center py-3 rounded-xl shadow-lg disabled:opacity-50"
                >
                  {submitting ? "Validating & Creating..." : "Register & Dispatch Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Created Restaurant & Credentials Modal ──────────────────────────── */}
      {createdInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-pop">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center">
              <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold">Restaurant Onboarded Successfully!</h2>
              <p className="text-xs text-emerald-100 mt-1">
                {createdInfo.credentials.emailSent
                  ? `Onboarding email sent to ${createdInfo.credentials.email}`
                  : `Onboarding email could not be sent. Send a reset email to ${createdInfo.credentials.email}.`}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Restaurant</span>
                  <span className="text-sm font-bold text-slate-900">{createdInfo.restaurant.name}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Admin Portal</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-white px-2 py-1 rounded border border-slate-300 font-mono">
                      {createdInfo.credentials.loginUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdInfo.credentials.loginUrl, "url")}
                      className="p-1 rounded hover:bg-slate-200 text-slate-600"
                    >
                      {copiedField === "url" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Login Email</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-white px-2 py-1 rounded border border-slate-300 font-mono">
                      {createdInfo.credentials.email}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdInfo.credentials.email, "email")}
                      className="p-1 rounded hover:bg-slate-200 text-slate-600"
                    >
                      {copiedField === "email" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                🔒 <strong>Secure access:</strong> Owners set or reset their password through an email verification code.
              </div>

              <button
                onClick={() => setCreatedInfo(null)}
                className="w-full btn-primary bg-slate-900 hover:bg-slate-800 text-white justify-center py-3 rounded-xl font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Direct Email to Owner Modal ─────────────────────────────────────── */}
      {emailModalResto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEmailModalResto(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#0B1736] to-blue-950 p-6 text-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-400" /> Dispatch Email to Owner
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Send official communication to {emailModalResto.name}
                </p>
              </div>
              <button onClick={() => setEmailModalResto(null)} className="p-1.5 rounded-xl hover:bg-white/10 text-white/70">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              {emailSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-semibold">
                  {emailSuccess}
                </div>
              )}
              {emailError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {emailError}
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Recipient:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {emailModalResto.contactEmail || emailModalResto.users?.[0]?.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Owner Name:</span>
                  <span className="font-bold text-slate-800">
                    {emailModalResto.ownerName || emailModalResto.users?.[0]?.name || emailModalResto.name}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Category / Tag</label>
                <select
                  className="input"
                  value={emailCategory}
                  onChange={(e) => setEmailCategory(e.target.value)}
                >
                  <option value="Platform Notice">Platform Notice</option>
                  <option value="Maintenance Advisory">Maintenance Advisory</option>
                  <option value="Security Update">Security Update</option>
                  <option value="Billing & Subscription">Billing & Subscription</option>
                  <option value="Important Announcement">Important Announcement</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Subject *</label>
                <input
                  className="input"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Message Content *</label>
                <textarea
                  className="input min-h-[140px] leading-relaxed"
                  required
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailModalResto(null)}
                  className="btn-primary border border-slate-200 text-slate-700 flex-1 justify-center py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="btn-primary bg-[#0B1736] hover:bg-slate-900 text-white flex-1 justify-center py-2.5 rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {sendingEmail ? (
                    "Dispatching..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Send Email Now
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Restaurant & Owner Details Modal ───────────────────────────── */}
      {editResto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditResto(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">Edit Restaurant & Owner Details</h2>
              <button onClick={() => setEditResto(null)} className="p-1.5 rounded-xl hover:bg-white/10 text-white/70">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Restaurant Name</label>
                <input
                  className="input"
                  required
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Owner Full Name</label>
                  <input
                    className="input"
                    value={editData.ownerName}
                    onChange={(e) => setEditData({ ...editData, ownerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Owner Email</label>
                  <input
                    className="input"
                    type="email"
                    value={editData.contactEmail}
                    onChange={(e) => setEditData({ ...editData, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Phone</label>
                  <input
                    className="input"
                    value={editData.contactPhone}
                    onChange={(e) => setEditData({ ...editData, contactPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Location</label>
                  <input
                    className="input"
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Subscription Plan</label>
                <select
                  className="input"
                  value={editData.plan}
                  onChange={(e) => setEditData({ ...editData, plan: e.target.value })}
                >
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Premium">Premium</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditResto(null)}
                  className="btn-primary border border-slate-200 text-slate-700 flex-1 justify-center py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary bg-slate-900 hover:bg-slate-800 text-white flex-1 justify-center py-2.5 rounded-xl shadow-md disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Restaurant Detail Side Drawer ───────────────────────────────────── */}
      {selected && (
        <div className="w-88 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden animate-slide-in-right shadow-xl">
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <h2 className="font-bold text-slate-900">Restaurant Overview</h2>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#0B1736] to-blue-900 flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-md">
                {selected.name[0]?.toUpperCase()}
              </div>
              <p className="font-bold text-slate-900 text-lg leading-tight">{selected.name}</p>
              <p className="text-xs font-mono text-slate-400">/{selected.slug}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`badge ${selected.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"} font-semibold text-xs`}>
                  {selected.isActive ? "Active Partner" : "Suspended / Blocked"}
                </span>
                <span className="badge bg-slate-100 text-slate-700 text-xs font-bold">
                  {selected.plan || "Pro"}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                <p className="text-xl font-bold text-slate-900">{selected._count?.orders ?? 0}</p>
                <p className="text-xs text-slate-400 font-medium">Orders Placed</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                <p className="text-xl font-bold text-slate-900">{selected._count?.tables ?? 0}</p>
                <p className="text-xs text-slate-400 font-medium">Active Tables</p>
              </div>
            </div>

            {/* Owner Details Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="font-bold text-slate-600 uppercase tracking-wider">Owner Details</span>
                <button
                  onClick={() => openEditModal(selected)}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Name</span>
                <span className="font-semibold text-slate-800">{selected.ownerName || selected.users?.[0]?.name || "Not Specified"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email</span>
                <span className="font-mono font-medium text-slate-800">{selected.contactEmail || selected.users?.[0]?.email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone</span>
                <span className="font-medium text-slate-800">{selected.contactPhone || selected.users?.[0]?.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location</span>
                <span className="font-medium text-slate-800">{selected.location || "Bengaluru, KA"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Created</span>
                <span className="font-medium text-slate-800">{formatDate(selected.createdAt)}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => openEmailModal(selected)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 py-2.5 text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                <Mail className="h-4 w-4" /> Send Direct Email to Owner
              </button>

              <a
                href={`/r/${selected.slug}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View Live Public QR Menu
              </a>

              <button
                onClick={() => toggleStatus(selected)}
                className={`w-full rounded-xl py-2.5 text-xs font-bold transition-colors ${
                  selected.isActive
                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                {selected.isActive ? "Block / Suspend Restaurant" : "Unblock / Reactivate Restaurant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
