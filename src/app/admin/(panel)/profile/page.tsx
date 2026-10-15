"use client";

import { useEffect, useState } from "react";
import { Save, MapPin, Phone, Mail, Globe, Eye, Building2, User, CheckCircle2 } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import Link from "next/link";

export default function RestaurantProfilePage() {
  const [tab, setTab] = useState("basic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Dynamic Restaurant Data from DB
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [tagline, setTagline] = useState("Authentic Taste & Quality Hospitality");
  const [cuisine, setCuisine] = useState("Multi Cuisine");
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [openNow, setOpenNow] = useState(true);

  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, res] = await Promise.all([
          fetch("/api/admin/me"),
          fetch("/api/admin/restaurant", { cache: "no-store" }),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.role === "STAFF") {
            setAccessDenied(true);
            setLoading(false);
            return;
          }
        }

        if (res.ok) {
          const data = await res.json();
          const r = data.restaurant;
          if (r) {
            setSlug(r.slug || "");
            setName(r.name || "");
            setOwnerName(r.ownerName || "");
            setLocation(r.location || "");
            setPhone(r.contactPhone || "");
            setEmail(r.contactEmail || "");
            setLogoUrl(r.logoUrl || "");
            setOpenNow(r.openNow ?? true);
            setAbout(
              r.about ||
              `${r.name || "Our restaurant"} brings a delightful dining experience with premium ingredients and exceptional hospitality.`
            );
          }
        }
      } catch (err) {
        console.error("Failed to load restaurant profile", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ownerName: ownerName.trim() || null,
          contactEmail: email.trim() || null,
          contactPhone: phone.trim() || null,
          location: location.trim() || null,
          logoUrl: logoUrl || null,
          openNow,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setSaving(false);
    }
  }

  const TABS = [
    { id: "basic", label: "Basic Information" },
    { id: "branding", label: "Branding & Media" },
    { id: "contact", label: "Contact & Location" },
  ];

  if (accessDenied) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 pt-16">
        <div className="h-16 w-16 mx-auto bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center">
          <Building2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Owner Access Required</h2>
        <p className="text-sm text-slate-500">
          Restaurant Profile and Legal Information can only be configured by the restaurant owner.
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#132A1E] to-[#2D5A3D] text-white px-6 py-5 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display tracking-tight">
                  Restaurant Profile & Branding 🌿
                </h1>
                <span className="text-xs bg-white/15 px-2.5 py-0.5 rounded-full font-mono text-emerald-200">
                  /{slug}
                </span>
              </div>
              <p className="text-white/70 text-xs mt-0.5">
                Manage operational info, contact details, and customer-facing branding.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {slug && (
                <Link
                  href={`/r/${slug}`}
                  target="_blank"
                  className="btn-primary bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs px-3.5 py-2 rounded-xl transition-all"
                >
                  <Eye className="h-4 w-4" /> View Live Menu
                </Link>
              )}
              <button
                onClick={save}
                disabled={saving || loading}
                className="btn-primary bg-[#D4A94C] hover:bg-amber-400 text-[#132A1E] text-xs px-4 py-2 font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saved ? "Saved ✓" : saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 px-6 pt-3 pb-0 border-b border-slate-200 bg-white flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                tab === t.id
                  ? "border-[#132A1E] text-[#132A1E]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content & Live Preview */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-5">
            {tab === "basic" && (
              <div className="card p-5 space-y-4">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Restaurant Information
                </h2>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Restaurant Name *
                    </label>
                    <input
                      className="input"
                      value={name}
                      placeholder="e.g. Kapi Chai"
                      required
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Owner / Manager Name
                    </label>
                    <input
                      className="input"
                      value={ownerName}
                      placeholder="e.g. Ramesh Hegde"
                      onChange={(e) => setOwnerName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Cuisine Type
                    </label>
                    <select
                      className="input"
                      value={cuisine}
                      onChange={(e) => setCuisine(e.target.value)}
                    >
                      {[
                        "South Indian & Filter Coffee",
                        "Multi Cuisine",
                        "North Indian",
                        "Cafe & Bakery",
                        "Biryani & Mughlai",
                        "Fast Food & Snacks",
                        "Chinese & Asian",
                        "Fine Dining",
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Tagline / Motto
                    </label>
                    <input
                      className="input"
                      value={tagline}
                      placeholder="e.g. Authentic Taste & Quality Hospitality"
                      onChange={(e) => setTagline(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      About Restaurant
                    </label>
                    <textarea
                      className="input resize-none"
                      rows={3}
                      value={about}
                      placeholder="Describe your dining experience and specialty..."
                      onChange={(e) => setAbout(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Operating Status
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenNow(!openNow)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        openNow
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-rose-50 text-rose-700 border-rose-300"
                      }`}
                    >
                      {openNow ? "● Open for Orders" : "○ Closed / Paused"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "branding" && (
              <div className="card p-5 space-y-4">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Branding & Digital Media
                </h2>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-2 block">
                    Restaurant Logo
                  </label>
                  <ImageUpload
                    value={logoUrl}
                    onChange={(url) => setLogoUrl(url)}
                    folder="restaurant-logos"
                    label="Upload restaurant emblem/logo"
                    hint="Recommended: 400×400px · PNG or JPEG with high contrast"
                    aspectRatio="square"
                  />
                </div>
              </div>
            )}

            {tab === "contact" && (
              <div className="card p-5 space-y-4">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Contact & Location
                </h2>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Physical Address / Location *
                    </label>
                    <input
                      className="input"
                      value={location}
                      placeholder="e.g. MG Road, Indiranagar, Bengaluru"
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Contact Phone
                    </label>
                    <input
                      className="input"
                      value={phone}
                      placeholder="e.g. +91 98765 43210"
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Official Email
                    </label>
                    <input
                      className="input"
                      type="email"
                      value={email}
                      placeholder="owner@restaurant.com"
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Live Preview for Current Restaurant */}
          <div className="space-y-4">
            <div className="card p-5 bg-gradient-to-b from-[#132A1E] to-[#1C3C29] text-white">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 block mb-3">
                Live Diner Preview
              </span>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 font-extrabold text-2xl shadow-lg mb-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-cover rounded-2xl" />
                  ) : (
                    name[0]?.toUpperCase() || "R"
                  )}
                </div>
                <h3 className="font-extrabold text-base text-white">{name || "Your Restaurant"}</h3>
                <p className="text-xs text-white/70 mt-0.5">{tagline}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${openNow ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}`}>
                    {openNow ? "● Open Now" : "○ Currently Closed"}
                  </span>
                  <span className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full font-medium">
                    {cuisine}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-white/80 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{location || "Location not set"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{phone || "Phone not set"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{email || "Email not set"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
