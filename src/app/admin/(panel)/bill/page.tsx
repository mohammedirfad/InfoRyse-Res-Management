"use client";

import { useEffect, useState } from "react";
import { Printer, CheckCircle, RefreshCw, Receipt, Users, Clock } from "lucide-react";
import { formatRupees, formatTime } from "@/lib/utils";

type AggregatedItem = { name: string; unitPrice: number; quantity: number; subtotal: number };
type OrderSummary   = {
  id: string; orderNumber: number; status: string; createdAt: string;
  customerName: string | null; subtotal: number;
  items: { nameSnapshot: string; priceCentsSnapshot: number; quantity: number }[];
};
type Session = {
  id: string; status: string; createdAt: string; orderCount: number;
  orders: OrderSummary[]; aggregatedItems: AggregatedItem[]; subtotalCents: number;
};
type Table = { id: string; label: string; section: string | null; status: string };

const TAX_RATE = 0.05;
const PACKING  = 2000;

const ORDER_STATUS_COLOR: Record<string,string> = {
  NEW:"text-orange-500", ACCEPTED:"text-amber-600", PREPARING:"text-blue-600",
  READY:"text-purple-600", COMPLETED:"text-green-600", CANCELLED:"text-gray-400",
};

export default function BillPage() {
  const [tables,         setTables]         = useState<Table[]>([]);
  const [selectedTable,  setSelectedTable]  = useState<Table | null>(null);
  const [session,        setSession]        = useState<Session | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [taxName,        setTaxName]        = useState("GST");
  const [taxPercent,     setTaxPercent]     = useState(5);
  const [loading,        setLoading]        = useState(false);
  const [finalizing,     setFinalizing]     = useState(false);

  useEffect(() => {
    // Load occupied tables + restaurant info
    Promise.all([
      fetch("/api/admin/tables").then(r => r.json()),
      fetch("/api/admin/me").then(r => r.json()),
    ]).then(([t, m]) => {
      setTables((t.tables ?? []).filter((tb: Table) => tb.status === "OCCUPIED"));
      setRestaurantName(m.restaurant?.name ?? "");
      setTaxName(m.restaurant?.taxName ?? "GST");
      setTaxPercent(m.restaurant?.taxPercent ?? 5);
    });
  }, []);

  async function loadBill(table: Table) {
    setSelectedTable(table);
    setSession(null);
    setLoading(true);
    const res = await fetch(`/api/admin/table-bill/${table.id}`);
    const data = await res.json();
    setSession(data.session);
    setLoading(false);
  }

  async function finalizeSession() {
    if (!session) return;
    setFinalizing(true);
    await fetch(`/api/admin/table-session/${session.id}/finalize`, { method: "POST" });
    setFinalizing(false);
    // Refresh
    if (selectedTable) loadBill(selectedTable);
    // Remove table from occupied list
    setTables(p => p.filter(t => t.id !== selectedTable?.id));
    setSelectedTable(null);
    setSession(null);
  }

  function printBill() {
    if (!session || !selectedTable) return;
    const sub = session.subtotalCents;
    const tax = Math.round(sub * taxPercent / 100);
    const total = sub + tax + PACKING;
    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Table ${selectedTable.label} — Final Bill</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Courier New',monospace; font-size:13px; padding:16px; max-width:300px; }
        h1  { font-size:18px; text-align:center; font-family:Georgia,serif; margin-bottom:2px; }
        .c  { text-align:center; }
        .d  { border-top:1px dashed #000; margin:8px 0; }
        .r  { display:flex; justify-content:space-between; margin:3px 0; }
        .t  { display:flex; justify-content:space-between; font-size:15px; font-weight:bold; border-top:2px solid #000; padding-top:6px; margin-top:6px; }
        .f  { text-align:center; margin-top:14px; font-size:11px; }
      </style></head><body>
      <h1>${restaurantName}</h1>
      <p class="c" style="font-size:11px;color:#666">Good Food · Brighter Moments</p>
      <div class="d"></div>
      <div class="r"><b>Table ${selectedTable.label}</b><span>${new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></div>
      <div class="r"><span>Orders in session</span><span>${session.orderCount}</span></div>
      <div class="d"></div>
      <b>Items</b>
      ${session.aggregatedItems.map(i => `
        <div class="r"><span>${i.name} ×${i.quantity}</span><span>₹${(i.subtotal/100).toFixed(0)}</span></div>
      `).join("")}
      <div class="d"></div>
      <div class="r"><span>Subtotal</span><span>₹${(sub/100).toFixed(0)}</span></div>
      <div class="r"><span>${taxName} (${taxPercent}%)</span><span>₹${(tax/100).toFixed(0)}</span></div>
      <div class="r"><span>Packing</span><span>₹${(PACKING/100).toFixed(0)}</span></div>
      <div class="t"><span>TOTAL</span><span>₹${(total/100).toFixed(0)}</span></div>
      <div class="f"><div class="d"></div><p>Thank you for dining with us!</p><p style="margin-top:4px">Powered by InfoRyse</p></div>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }

  const subtotal = session?.subtotalCents ?? 0;
  const tax      = Math.round(subtotal * taxPercent / 100);
  const total    = subtotal + tax + PACKING;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Table selector ──────────────────────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 bg-white border-r border-black/5 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-black/5">
          <h2 className="font-bold text-gray-900 text-sm">Occupied Tables</h2>
          <p className="text-xs text-gray-400 mt-0.5">Select a table to view its bill</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {tables.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">No occupied tables</p>
          )}
          {tables.map(t => (
            <button key={t.id} onClick={() => loadBill(t)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all
                ${selectedTable?.id === t.id ? "bg-[#132A1E] text-white" : "hover:bg-gray-50 text-gray-700"}`}>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold
                ${selectedTable?.id === t.id ? "bg-white/20 text-white" : "bg-red-100 text-red-700"}`}>
                {t.label}
              </div>
              <div>
                <p className="text-sm font-semibold">{t.label}</p>
                <p className={`text-xs ${selectedTable?.id === t.id ? "text-white/60" : "text-gray-400"}`}>
                  {t.section ?? ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bill panel ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedTable && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4">
            <Receipt className="h-16 w-16" />
            <div className="text-center">
              <p className="font-semibold text-lg">Select a table</p>
              <p className="text-sm mt-1">to view and finalize the bill</p>
            </div>
          </div>
        )}

        {selectedTable && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#132A1E] to-[#1C3C29] text-white px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold">Table {selectedTable.label} — Running Bill</h1>
                  <p className="text-white/50 text-sm">
                    {loading ? "Loading…" : session ? `${session.orderCount} order${session.orderCount > 1 ? "s" : ""} in this session` : "No active orders yet"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadBill(selectedTable)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  {session && (
                    <>
                      <button onClick={printBill}
                        className="btn-primary bg-white/10 border border-white/20 text-white text-sm px-4 py-2 rounded-xl">
                        <Printer className="h-4 w-4" /> Print Bill
                      </button>
                      <button onClick={finalizeSession} disabled={finalizing}
                        className="btn-primary bg-[#D4A94C] text-[#132A1E] text-sm px-4 py-2 rounded-xl font-bold disabled:opacity-60">
                        <CheckCircle className="h-4 w-4" />
                        {finalizing ? "Finalizing…" : "Finalize & Close Table"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {loading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-[#132A1E] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && !session && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3">
                <Receipt className="h-12 w-12" />
                <p className="font-medium">No open session for this table</p>
                <p className="text-sm">Orders will appear here when customers start ordering</p>
              </div>
            )}

            {!loading && session && (
              <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 xl:grid-cols-2 gap-5">

                {/* ── Left: Individual orders ────────────────────────────── */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Individual Orders</p>
                  {session.orders.map((o, idx) => (
                    <div key={o.id} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-lg bg-[#132A1E]/10 text-[#132A1E] text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-gray-900 text-sm">Order #{o.orderNumber}</span>
                          {o.customerName && <span className="text-xs text-gray-400">· {o.customerName}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${ORDER_STATUS_COLOR[o.status] ?? "text-gray-500"}`}>
                            {o.status}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />{formatTime(o.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-3 space-y-1">
                        {o.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm text-gray-600">
                            <span>{item.nameSnapshot} × {item.quantity}</span>
                            <span>{formatRupees(item.priceCentsSnapshot * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t border-black/5">
                          <span>Order subtotal</span>
                          <span>{formatRupees(o.subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Right: Unified bill ───────────────────────────────── */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Consolidated Bill</p>

                  {/* All items aggregated */}
                  <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-black/5 flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-gray-900 text-sm">All Items — Table {selectedTable.label}</span>
                    </div>
                    <div className="px-5 py-4 space-y-2">
                      {session.aggregatedItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.quantity} × {formatRupees(item.unitPrice)}</p>
                          </div>
                          <span className="font-semibold text-gray-900">{formatRupees(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bill summary — GST shown only here (not in individual orders) */}
                  <div className="bg-[#132A1E]/5 border border-[#132A1E]/10 rounded-2xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Final Bill Summary</p>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatRupees(subtotal)}</span></div>
                      <div className="flex justify-between text-gray-600"><span>Packing Charges</span><span>{formatRupees(PACKING)}</span></div>
                      <div className="flex justify-between text-gray-600">
                        <span>{taxName} ({taxPercent}%)</span>
                        <span>{formatRupees(tax)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-[#132A1E] text-xl pt-3 border-t border-[#132A1E]/15">
                        <span>TOTAL</span>
                        <span>{formatRupees(total)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button onClick={printBill}
                        className="btn-primary border-2 border-[#132A1E]/20 text-[#132A1E] justify-center py-3 rounded-xl text-sm font-semibold">
                        <Printer className="h-4 w-4" /> Print Bill
                      </button>
                      <button onClick={finalizeSession} disabled={finalizing}
                        className="btn-primary bg-[#132A1E] text-white justify-center py-3 rounded-xl text-sm font-bold disabled:opacity-60">
                        <CheckCircle className="h-4 w-4" />
                        {finalizing ? "Closing…" : "Close Table"}
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 text-center mt-2">
                      Closing the table finalizes the bill and marks it available for new guests
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
