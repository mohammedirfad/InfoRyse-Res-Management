"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Download, Printer, Share2, RefreshCw, X,
  Users, Wifi, QrCode, CheckCircle, AlertCircle,
  Clock, Wrench, LayoutGrid, List, ChevronRight
} from "lucide-react";

type Table = {
  id: string; label: string; section: string | null;
  status: string; capacity?: number | null; menuUrl?: string;
};

const STATUS: Record<string, {
  label: string; dot: string; bg: string; text: string;
  border: string; floorBg: string; emoji: string;
}> = {
  AVAILABLE:      { label:"Available",      dot:"bg-green-500",  bg:"bg-green-50",   text:"text-green-700",  border:"border-green-200", floorBg:"bg-green-500",  emoji:"🟢" },
  OCCUPIED:       { label:"Occupied",       dot:"bg-red-500",    bg:"bg-red-50",     text:"text-red-700",    border:"border-red-200",   floorBg:"bg-red-500",    emoji:"🔴" },
  RESERVED:       { label:"Reserved",       dot:"bg-amber-400",  bg:"bg-amber-50",   text:"text-amber-700",  border:"border-amber-200", floorBg:"bg-amber-400",  emoji:"🟡" },
  OUT_OF_SERVICE: { label:"Out of Service", dot:"bg-gray-400",   bg:"bg-gray-100",   text:"text-gray-500",   border:"border-gray-200",  floorBg:"bg-gray-400",   emoji:"⚫" },
};

export default function TablesPage() {
  const [tables, setTables]         = useState<Table[]>([]);
  const [selected, setSelected]     = useState<Table | null>(null);
  const [qrImages, setQrImages]     = useState<Record<string, string>>({});
  const [qrLoading, setQrLoading]   = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode]     = useState<"floor" | "list">("floor");
  const [count, setCount]           = useState(5);
  const [section, setSection]       = useState("Indoor");
  const [generating, setGenerating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [filterSection, setFilterSection] = useState("all");

  // cache in sessionStorage for speed
  const load = useCallback(async (bust = false) => {
    if (!bust) {
      const cached = sessionStorage.getItem("admin_tables");
      if (cached) { try { setTables(JSON.parse(cached)); } catch {} }
    }
    const res = await fetch("/api/admin/tables", { cache: "no-store" });
    const data = await res.json();
    const list: Table[] = data.tables ?? [];
    setTables(list);
    sessionStorage.setItem("admin_tables", JSON.stringify(list));
    if (selected) {
      const updated = list.find(t => t.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [selected]);

  useEffect(() => { load(); }, []);

  async function setStatus(table: Table, status: string) {
    setUpdatingStatus(true);
    const res = await fetch(`/api/admin/tables/${table.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      sessionStorage.removeItem("admin_tables");
      setSelected(t => t ? { ...t, status } : t);
      setTables(p => p.map(t => t.id === table.id ? { ...t, status } : t));
    }
    setUpdatingStatus(false);
  }

  async function loadQr(table: Table) {
    if (qrImages[table.id]) return;
    setQrLoading(p => ({ ...p, [table.id]: true }));
    const res = await fetch(`/api/admin/tables/${table.id}/qr`);
    const data = await res.json();
    if (data.qrPngDataUrl) setQrImages(p => ({ ...p, [table.id]: data.qrPngDataUrl }));
    setQrLoading(p => ({ ...p, [table.id]: false }));
  }

  async function regenerateQr(table: Table) {
    const res = await fetch(`/api/admin/tables/${table.id}/qr`, { method: "POST" });
    const data = await res.json();
    if (data.qrPngDataUrl) setQrImages(p => ({ ...p, [table.id]: data.qrPngDataUrl }));
  }

  async function generateTables() {
    setGenerating(true);
    const startIndex = tables.length + 1;
    await fetch("/api/admin/tables/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count, section, startIndex }),
    });
    setGenerating(false);
    sessionStorage.removeItem("admin_tables");
    load(true);
  }

  function openTable(t: Table) {
    setSelected(t);
    loadQr(t);
  }

  const sections = ["all", ...new Set(tables.map(t => t.section ?? "General"))];
  const visibleTables = filterSection === "all" ? tables : tables.filter(t => (t.section ?? "General") === filterSection);

  const counts = {
    total:    tables.length,
    available:tables.filter(t => t.status === "AVAILABLE").length,
    occupied: tables.filter(t => t.status === "OCCUPIED").length,
    reserved: tables.filter(t => t.status === "RESERVED").length,
    oos:      tables.filter(t => t.status === "OUT_OF_SERVICE").length,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#132A1E] to-[#1C3C29] text-white px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Table Management 🌿</h1>
              <p className="text-white/50 text-sm mt-0.5">Monitor occupancy, manage reservations, generate QR codes</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode(m => m === "floor" ? "list" : "floor")}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm px-4 py-2 rounded-xl transition-colors">
                {viewMode === "floor" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                {viewMode === "floor" ? "List View" : "Floor View"}
              </button>
              <button onClick={() => load(true)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* KPI stats */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label:"Total",      val:counts.total,     icon:"🪑", bg:"bg-white",      ring:"" },
              { label:"Available",  val:counts.available, icon:"🟢", bg:"bg-green-50",   ring:"ring-1 ring-green-100" },
              { label:"Occupied",   val:counts.occupied,  icon:"🔴", bg:"bg-red-50",     ring:"ring-1 ring-red-100" },
              { label:"Reserved",   val:counts.reserved,  icon:"🟡", bg:"bg-amber-50",   ring:"ring-1 ring-amber-100" },
              { label:"Out of Svc", val:counts.oos,       icon:"⚫", bg:"bg-gray-100",   ring:"" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} ${s.ring} rounded-2xl p-4 text-center shadow-sm`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <p className="text-2xl font-bold text-gray-900">{s.val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Generate tables + legend */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Count</label>
              <input type="number" className="input w-20 text-sm py-2" value={count} min={1} max={50}
                onChange={e => setCount(Number(e.target.value))} />
            </div>
            <div className="flex-1 min-w-32">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Section</label>
              <input className="input text-sm py-2" placeholder="Indoor / Outdoor / Private" value={section}
                onChange={e => setSection(e.target.value)} />
            </div>
            <button onClick={generateTables} disabled={generating}
              className="btn-primary bg-[#132A1E] text-white px-5 py-2.5 text-sm rounded-xl whitespace-nowrap">
              <Plus className="h-4 w-4" />
              {generating ? "Generating…" : `Generate ${count} Tables`}
            </button>
            <div className="flex items-center gap-3 ml-auto flex-wrap">
              {Object.entries(STATUS).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className={`h-2.5 w-2.5 rounded-full ${v.dot}`} />
                  {v.label}
                </div>
              ))}
            </div>
          </div>

          {/* Section filter tabs */}
          {sections.length > 2 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {sections.map(s => (
                <button key={s} onClick={() => setFilterSection(s)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-sm font-medium transition-all
                    ${filterSection === s ? "bg-[#132A1E] text-white" : "bg-white text-gray-600 border border-black/8"}`}>
                  {s === "all" ? "All Sections" : s}
                </button>
              ))}
            </div>
          )}

          {/* ── FLOOR VIEW ──────────────────────────────────────────────────── */}
          {viewMode === "floor" && (
            <div className="space-y-5">
              {[...new Set(visibleTables.map(t => t.section ?? "General"))].map(sec => (
                <div key={sec} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5">
                    <h3 className="font-semibold text-gray-900 text-sm">{sec} Section</h3>
                    <span className="text-xs text-gray-400">
                      {visibleTables.filter(t => (t.section ?? "General") === sec).length} tables
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap gap-3">
                      {visibleTables.filter(t => (t.section ?? "General") === sec).map(t => {
                        const meta = STATUS[t.status] ?? STATUS.AVAILABLE;
                        const isSelected = selected?.id === t.id;
                        return (
                          <button key={t.id} onClick={() => openTable(t)}
                            className={`relative flex flex-col items-center justify-center rounded-2xl text-white font-bold
                              transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md
                              ${meta.floorBg} hover:opacity-90
                              ${isSelected ? "ring-4 ring-offset-2 ring-[#132A1E] ring-offset-white scale-105" : ""}`}
                            style={{ width: 76, height: 76 }}>
                            {/* Status dot top-right */}
                            <div className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${meta.dot}`} />
                            <span className="text-base font-extrabold">{t.label}</span>
                            {t.capacity && <span className="text-[9px] text-white/70 mt-0.5">{t.capacity} seats</span>}
                            {t.status === "OCCUPIED" && (
                              <span className="text-[9px] text-white/70">Busy</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {visibleTables.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-300">
                  <QrCode className="h-12 w-12 mx-auto mb-3" />
                  <p className="font-medium">No tables yet. Generate some above.</p>
                </div>
              )}
            </div>
          )}

          {/* ── LIST VIEW ────────────────────────────────────────────────────── */}
          {viewMode === "list" && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full data-table">
                <thead><tr><th>Table</th><th>Section</th><th>Capacity</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {visibleTables.map(t => {
                    const meta = STATUS[t.status] ?? STATUS.AVAILABLE;
                    return (
                      <tr key={t.id} onClick={() => openTable(t)} className="cursor-pointer hover:bg-gray-50/60 transition-colors">
                        <td className="font-bold text-gray-900">{t.label}</td>
                        <td className="text-gray-500">{t.section ?? "—"}</td>
                        <td className="text-gray-500">{t.capacity ? `${t.capacity} seats` : "—"}</td>
                        <td>
                          <span className={`badge ${meta.bg} ${meta.text} border ${meta.border}`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>
                        <td>
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── TABLE DETAIL SIDE PANEL ──────────────────────────────────────────── */}
      <div className={`flex-shrink-0 border-l border-black/5 bg-white flex flex-col overflow-hidden transition-all duration-300
        ${selected ? "w-80 opacity-100" : "w-0 opacity-0 pointer-events-none"}`}>
        {selected && (
          <>
            {/* Panel header */}
            <div className="flex items-center justify-between p-5 border-b border-black/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${STATUS[selected.status]?.floorBg ?? "bg-gray-400"} flex items-center justify-center text-white font-extrabold text-sm`}>
                  {selected.label}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selected.label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`h-2 w-2 rounded-full ${STATUS[selected.status]?.dot}`} />
                    <span className="text-xs text-gray-500">{STATUS[selected.status]?.label}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* ── Quick status actions ────────────────────────────────────── */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>

                {selected.status === "AVAILABLE" && (
                  <button onClick={() => setStatus(selected, "OCCUPIED")} disabled={updatingStatus}
                    className="w-full btn-primary bg-red-500 hover:bg-red-600 text-white justify-center py-3.5 rounded-2xl font-bold text-sm mb-2 shadow-sm shadow-red-200 transition-all active:scale-[0.98] disabled:opacity-60">
                    🪑 Seat Guests — Mark Occupied
                  </button>
                )}
                {selected.status === "OCCUPIED" && (
                  <button onClick={() => setStatus(selected, "AVAILABLE")} disabled={updatingStatus}
                    className="w-full btn-primary bg-green-600 hover:bg-green-700 text-white justify-center py-3.5 rounded-2xl font-bold text-sm mb-2 shadow-sm shadow-green-200 transition-all active:scale-[0.98] disabled:opacity-60">
                    ✓ Guests Left — Free Table
                  </button>
                )}
                {selected.status === "RESERVED" && (
                  <button onClick={() => setStatus(selected, "OCCUPIED")} disabled={updatingStatus}
                    className="w-full btn-primary bg-amber-500 hover:bg-amber-600 text-white justify-center py-3.5 rounded-2xl font-bold text-sm mb-2 transition-all active:scale-[0.98] disabled:opacity-60">
                    🔓 Reservation Arrived
                  </button>
                )}

                {/* All statuses grid */}
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS).map(([s, meta]) => (
                    <button key={s} onClick={() => setStatus(selected, s)} disabled={updatingStatus}
                      className={`rounded-xl py-2.5 text-xs font-semibold border-2 transition-all active:scale-95 disabled:opacity-50
                        ${selected.status === s ? `${meta.bg} ${meta.text} ${meta.border}` : "border-black/8 text-gray-500 hover:bg-gray-50"}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${meta.dot} inline-block mr-1.5`} />
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── QR Code section ─────────────────────────────────────────── */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">QR Code</p>
                <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center gap-3 border border-black/5">
                  {qrLoading[selected.id] ? (
                    <div className="w-40 h-40 rounded-xl bg-gray-200 flex items-center justify-center">
                      <div className="h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : qrImages[selected.id] ? (
                    <img src={qrImages[selected.id]} alt={`QR ${selected.label}`}
                      className="w-40 h-40 rounded-xl border border-black/5 shadow-sm" />
                  ) : (
                    <div className="w-40 h-40 rounded-xl bg-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer"
                      onClick={() => loadQr(selected)}>
                      <QrCode className="h-8 w-8 text-gray-400" />
                      <span className="text-xs text-gray-400">Tap to load QR</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {qrImages[selected.id] && (
                      <a href={qrImages[selected.id]} download={`${selected.label}-qr.png`}
                        className="flex flex-col items-center gap-1 rounded-xl border border-black/8 p-2.5 hover:bg-white transition-colors text-gray-600 cursor-pointer">
                        <Download className="h-4 w-4" />
                        <span className="text-[10px] font-medium">Download</span>
                      </a>
                    )}
                    <button onClick={() => window.print()}
                      className="flex flex-col items-center gap-1 rounded-xl border border-black/8 p-2.5 hover:bg-white transition-colors text-gray-600">
                      <Printer className="h-4 w-4" />
                      <span className="text-[10px] font-medium">Print</span>
                    </button>
                    <button
                      onClick={() => navigator.share?.({ title:`${selected.label} QR`, url: selected.menuUrl ?? "" })
                              .catch(()=>{})}
                      className="flex flex-col items-center gap-1 rounded-xl border border-black/8 p-2.5 hover:bg-white transition-colors text-gray-600">
                      <Share2 className="h-4 w-4" />
                      <span className="text-[10px] font-medium">Share</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Table details ───────────────────────────────────────────── */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-black/5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Table Details</p>
                {[
                  { label:"Table Number", value: selected.label                },
                  { label:"Section",      value: selected.section ?? "General" },
                  { label:"Capacity",     value: selected.capacity ? `${selected.capacity} people` : "Not set" },
                  { label:"Current Status",value: STATUS[selected.status]?.label ?? selected.status },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>

              {/* Regenerate QR */}
              <button onClick={() => regenerateQr(selected)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-red-100 text-red-500 py-3 text-sm font-medium hover:bg-red-50 transition-colors active:scale-[0.98]">
                <RefreshCw className="h-4 w-4" />
                Regenerate QR (invalidates old)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
