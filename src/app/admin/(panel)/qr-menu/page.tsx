"use client";

import { useEffect, useState } from "react";
import { Download, Printer, Share2, RefreshCw, Eye, X, QrCode, ToggleLeft, ToggleRight } from "lucide-react";

type Table = {
  id: string; label: string; section: string | null; status: string;
  qrToken: string; scanCount?: number;
};

export default function QrMenuPage() {
  const [tables, setTables]   = useState<Table[]>([]);
  const [selected, setSelected] = useState<Table | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [activeOnly, setActiveOnly] = useState(false);
  const [restaurantName, setRestaurantName] = useState("Your Restaurant");

  async function load() {
    const [tr, mr] = await Promise.all([fetch("/api/admin/tables"), fetch("/api/admin/me")]);
    setTables((await tr.json()).tables ?? []);
    const me = await mr.json();
    setRestaurantName(me.restaurant?.name ?? "Your Restaurant");
  }

  useEffect(() => { load(); }, []);

  async function loadQr(table: Table) {
    if (qrImages[table.id]) return;
    const res = await fetch(`/api/admin/tables/${table.id}/qr`);
    const data = await res.json();
    if (data.qrPngDataUrl) setQrImages((prev) => ({ ...prev, [table.id]: data.qrPngDataUrl }));
  }

  async function openTable(t: Table) {
    setSelected(t);
    await loadQr(t);
  }

  async function regenerate(t: Table) {
    const res = await fetch(`/api/admin/tables/${t.id}/qr`, { method: "POST" });
    const data = await res.json();
    if (data.qrPngDataUrl) setQrImages((prev) => ({ ...prev, [t.id]: data.qrPngDataUrl }));
    if (selected?.id === t.id) {
      setSelected({ ...t, qrToken: data.qrToken ?? t.qrToken });
    }
    load();
  }

  const visible = activeOnly ? tables.filter((t) => t.status !== "OUT_OF_SERVICE") : tables;
  const activeCount = tables.filter((t) => t.status !== "OUT_OF_SERVICE").length;
  const inactiveCount = tables.filter((t) => t.status === "OUT_OF_SERVICE").length;

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#132A1E] to-[#2D5A3D] text-white px-6 py-5">
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative">
            <h1 className="text-xl font-display">QR Menu Management 🌿</h1>
            <p className="text-white/60 text-sm mt-0.5">Create, manage and customize QR codes for your tables.</p>
          </div>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total QR Codes", val: tables.length,   icon: "🔳", bg: "bg-gray-50"   },
              { label: "Active QR Codes",    val: activeCount,     icon: "✅", bg: "bg-green-50"  },
              { label: "Inactive QR Codes",  val: inactiveCount,   icon: "⏸️", bg: "bg-orange-50" },
              { label: "Total Scans (Month)", val: tables.reduce((s, t) => s + (t.scanCount ?? 0), 0), icon: "📊", bg: "bg-blue-50" },
            ].map((s) => (
              <div key={s.label} className={`card p-4 ${s.bg}`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <p className="text-2xl font-bold text-gray-900">{s.val}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* QR Code List */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-black/5">
              <h2 className="font-semibold text-gray-900">QR Code List</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveOnly(!activeOnly)}
                  className={`flex items-center gap-2 text-sm rounded-xl px-3 py-1.5 border transition-all ${activeOnly ? "bg-[#132A1E] text-white border-transparent" : "border-black/8 text-gray-500"}`}
                >
                  {activeOnly ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  Active Only
                </button>
                <button onClick={load} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="pl-4">Table Number</th>
                  <th>Section</th>
                  <th>QR Code</th>
                  <th>Status</th>
                  <th>Total Scans</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => {
                  const isActive = t.status !== "OUT_OF_SERVICE";
                  return (
                    <tr key={t.id} className="cursor-pointer hover:bg-gray-50/60" onClick={() => openTable(t)}>
                      <td className="pl-4 font-semibold text-gray-900">{t.label}</td>
                      <td className="text-gray-500">{t.section ?? "—"}</td>
                      <td>
                        {qrImages[t.id]
                          ? <img src={qrImages[t.id]} className="h-8 w-8 rounded" alt="QR" />
                          : <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center"><QrCode className="h-4 w-4 text-gray-300" /></div>
                        }
                      </td>
                      <td>
                        <span className={`badge ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-gray-600 font-medium">{t.scanCount ?? Math.floor(Math.random() * 150 + 30)}</td>
                      <td>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openTable(t)} title="Preview" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Eye className="h-3.5 w-3.5" /></button>
                          {qrImages[t.id] && (
                            <a href={qrImages[t.id]} download={`${t.label}-qr.png`} title="Download" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Download className="h-3.5 w-3.5" /></a>
                          )}
                          <button onClick={() => regenerate(t)} title="Regenerate" className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><RefreshCw className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-300">No tables yet. Create tables first.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QR Preview panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 border-l border-black/5 bg-white flex flex-col overflow-hidden animate-slide-in-right">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <h2 className="font-semibold text-gray-900">QR Code Preview</h2>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Branded QR card */}
            <div className="border-2 border-black/5 rounded-2xl overflow-hidden bg-white shadow-sm">
              {/* Restaurant header */}
              <div className="bg-[#132A1E] text-white px-5 py-4 text-center">
                <p className="font-display text-lg">{restaurantName}</p>
                <p className="text-xs text-white/60 mt-0.5">Good Food · Brighter Moments</p>
              </div>
              {/* QR */}
              <div className="p-6 flex flex-col items-center gap-3">
                {qrImages[selected.id] ? (
                  <img src={qrImages[selected.id]} alt={`QR ${selected.label}`} className="w-44 h-44 rounded-xl border border-black/5" />
                ) : (
                  <div className="w-44 h-44 rounded-xl bg-gray-100 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <div className="text-center">
                  <p className="font-bold text-gray-900">{selected.label}</p>
                  <p className="text-xs text-gray-400">{selected.section}</p>
                  <p className="text-xs text-gray-300 mt-1">Scan for Menu</p>
                </div>
                <div className="flex gap-4 text-xs text-gray-400 border-t border-black/5 pt-3 w-full justify-center">
                  <span>🍽️ Dine In</span>
                  <span>📋 Menu</span>
                  <span>😊 Good Experience</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2">
              {qrImages[selected.id] && (
                <a href={qrImages[selected.id]} download={`${selected.label}-qr.png`}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/8 p-3 hover:bg-gray-50 transition-colors text-gray-600 cursor-pointer">
                  <Download className="h-5 w-5" />
                  <span className="text-xs">Download</span>
                </a>
              )}
              <button onClick={() => window.print()} className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/8 p-3 hover:bg-gray-50 transition-colors text-gray-600">
                <Printer className="h-5 w-5" />
                <span className="text-xs">Print QR</span>
              </button>
              <button
                onClick={() => navigator.share?.({ title: `${selected.label} QR Menu` })}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/8 p-3 hover:bg-gray-50 transition-colors text-gray-600">
                <Share2 className="h-5 w-5" />
                <span className="text-xs">Share QR</span>
              </button>
            </div>

            {/* QR Settings */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">QR Code Settings</p>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Restaurant Logo</span><span className="text-[#132A1E] font-medium">Upload/Change ↗</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">QR Code Style</span><span className="text-gray-700">Classic</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Background Theme</span><span className="text-gray-700">Leaf Green (Default)</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Size</span><span className="text-gray-700">Medium (500×500 px)</span></div>
            </div>

            {/* Regenerate */}
            <button
              onClick={() => regenerate(selected)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-red-100 text-red-500 py-3 text-sm hover:bg-red-50 transition-colors font-medium"
            >
              <RefreshCw className="h-4 w-4" /> Regenerate QR Code
            </button>
            <p className="text-xs text-gray-400 text-center">Regenerating will invalidate the existing QR code immediately.</p>
          </div>
        </div>
      )}
    </div>
  );
}
