"use client";

import { useEffect, useState, useCallback } from "react";
import {
  History,
  Search,
  Download,
  Printer,
  FileText,
  DollarSign,
  Smartphone,
  CreditCard,
  Receipt,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Calendar,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { formatRupees, formatTime, formatDate } from "@/lib/utils";

type StoredBill = {
  id: string;
  billNumber: number;
  tableLabel: string;
  customerName: string | null;
  customerPhone: string | null;
  orderCount: number;
  subtotalCents: number;
  discountCents: number;
  discountPercent: number;
  discountName: string | null;
  taxCents: number;
  taxPercent: number;
  taxName: string;
  packingCents: number;
  totalCents: number;
  paymentMethod: string;
  paymentStatus: string;
  paidAt: string | null;
  itemsJson: string;
  createdAt: string;
};

const PAYMENT_ICONS: Record<string, any> = {
  CASH: DollarSign,
  UPI: Smartphone,
  CARD: CreditCard,
  OTHER: Receipt,
};

export default function PaymentsPage() {
  const [bills, setBills] = useState<StoredBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [selectedBillDetail, setSelectedBillDetail] = useState<StoredBill | null>(null);
  const [restaurantName, setRestaurantName] = useState("");

  const fetchBills = useCallback(
    async (targetPage = page) => {
      try {
        setLoading(true);
        const query = new URLSearchParams({
          page: targetPage.toString(),
          limit: "10",
          search,
          paymentMethod: methodFilter,
        });

        const [res, meRes] = await Promise.all([
          fetch(`/api/admin/bills?${query.toString()}`, { cache: "no-store" }),
          restaurantName ? Promise.resolve(null) : fetch("/api/admin/me", { cache: "no-store" }),
        ]);

        const data = await res.json();
        setBills(data.bills ?? []);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotalCount(data.pagination?.total ?? 0);
        setTotalRevenue(data.totalRevenueCents ?? 0);

        if (meRes) {
          const meData = await meRes.json();
          if (meData?.restaurant?.name) {
            setRestaurantName(meData.restaurant.name);
          }
        }
      } catch (err) {
        console.error("Failed to fetch bills:", err);
      } finally {
        setLoading(false);
      }
    },
    [page, search, methodFilter, restaurantName]
  );

  useEffect(() => {
    fetchBills(1);
  }, [fetchBills]);

  // Real-time auto-refresh when new bill is paid
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/admin/events");
      es.addEventListener("bill_updated", () => {
        fetchBills(1);
      });
    } catch {
      // ignore
    }
    return () => {
      es?.close();
    };
  }, [fetchBills]);

  // Thermal Print Receipt
  function printBill(b: StoredBill) {
    let parsedItems: any[] = [];
    try {
      parsedItems = JSON.parse(b.itemsJson);
    } catch {
      /* ignore */
    }

    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Official Bill #${b.billNumber} — Table ${b.tableLabel}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Courier New', monospace; font-size:13px; padding:18px; max-width:320px; color:#111; }
        h1  { font-size:18px; text-align:center; font-family:Georgia, serif; margin-bottom:2px; font-weight:bold; }
        .c  { text-align:center; }
        .d  { border-top:1px dashed #444; margin:8px 0; }
        .r  { display:flex; justify-content:space-between; margin:4px 0; }
        .t  { display:flex; justify-content:space-between; font-size:15px; font-weight:bold; border-top:2px solid #000; padding-top:6px; margin-top:6px; }
        .f  { text-align:center; margin-top:14px; font-size:11px; color:#555; }
        .disc { color:#0a6b36; font-weight:bold; }
      </style></head><body>
      <h1>${restaurantName || "Restaurant"}</h1>
      <p class="c" style="font-size:11px;color:#666">Fine Dining & Authentic Taste</p>
      <div class="d"></div>
      <div class="r"><b>BILL #${b.billNumber}</b><span>${b.paymentMethod} · ${b.paymentStatus}</span></div>
      <div class="r"><b>Table: ${b.tableLabel}</b><span>${new Date(b.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></div>
      <div class="r"><span>Date:</span><span>${new Date(b.createdAt).toLocaleDateString("en-IN")}</span></div>
      ${b.customerName ? `<div class="r"><span>Customer:</span><span>${b.customerName}</span></div>` : ""}
      <div class="d"></div>
      <b>Ordered Items:</b>
      ${parsedItems
        .map(
          (i) => `
        <div class="r"><span>${i.name} ×${i.quantity}</span><span>₹${(i.subtotal / 100).toFixed(0)}</span></div>
      `
        )
        .join("")}
      <div class="d"></div>
      <div class="r"><span>Subtotal:</span><span>₹${(b.subtotalCents / 100).toFixed(0)}</span></div>
      ${b.discountCents > 0 ? `<div class="r disc"><span>Discount (${b.discountName || "Offer"} ${b.discountPercent}%):</span><span>−₹${(b.discountCents / 100).toFixed(0)}</span></div>` : ""}
      <div class="r"><span>${b.taxName} (${b.taxPercent}%):</span><span>₹${(b.taxCents / 100).toFixed(0)}</span></div>
      <div class="r"><span>Packing & Service:</span><span>₹${(b.packingCents / 100).toFixed(0)}</span></div>
      <div class="t"><span>FINAL TOTAL:</span><span>₹${(b.totalCents / 100).toFixed(0)}</span></div>
      <div class="f"><div class="d"></div><p>Thank you for dining with us!</p><p style="margin-top:4px">Powered by InfoRyse</p></div>
      </body></html>`);
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  }

  // Export full bills history to CSV
  async function exportBillsToCSV() {
    try {
      const res = await fetch("/api/admin/bills?export=true", { cache: "no-store" });
      const data = await res.json();
      const all: StoredBill[] = data.bills ?? [];

      const headers = [
        "Bill #",
        "Table",
        "Customer",
        "Phone",
        "Date",
        "Time",
        "Subtotal",
        "Discount",
        "Tax",
        "Packing",
        "Total Paid",
        "Payment Method",
        "Status",
      ];
      const rows = all.map((b) => [
        `"#${b.billNumber}"`,
        `"Table ${b.tableLabel}"`,
        `"${b.customerName || "Table Guest"}"`,
        `"${b.customerPhone || ""}"`,
        new Date(b.createdAt).toLocaleDateString("en-IN"),
        new Date(b.createdAt).toLocaleTimeString("en-IN"),
        (b.subtotalCents / 100).toFixed(2),
        (b.discountCents / 100).toFixed(2),
        (b.taxCents / 100).toFixed(2),
        (b.packingCents / 100).toFixed(2),
        (b.totalCents / 100).toFixed(2),
        b.paymentMethod,
        b.paymentStatus,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `payment_history_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#132A1E] to-[#1F4733] text-white px-6 py-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <History className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Payment History & Settled Bills</h1>
                <p className="text-white/70 text-xs mt-0.5">
                  Complete immutable ledger of all settled tables, customer receipts, and payment transactions.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchBills(1)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={exportBillsToCSV}
              className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs font-black px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              <Download className="h-3.5 w-3.5" /> Export All CSV
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-white/70 text-xs font-medium">
              <span>Total Revenue Settled</span>
              <TrendingUp className="h-4 w-4 text-emerald-300" />
            </div>
            <p className="text-2xl font-black text-white mt-1.5">{formatRupees(totalRevenue)}</p>
            <p className="text-[11px] text-white/50 mt-1">Across all confirmed payments</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-white/70 text-xs font-medium">
              <span>Total Bills Settled</span>
              <CheckCircle2 className="h-4 w-4 text-amber-300" />
            </div>
            <p className="text-2xl font-black text-white mt-1.5">{totalCount} Bills</p>
            <p className="text-[11px] text-white/50 mt-1">Generated and archived</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-white/70 text-xs font-medium">
              <span>Average Ticket Size</span>
              <DollarSign className="h-4 w-4 text-sky-300" />
            </div>
            <p className="text-2xl font-black text-white mt-1.5">
              {totalCount > 0 ? formatRupees(Math.round(totalRevenue / totalCount)) : "₹0"}
            </p>
            <p className="text-[11px] text-white/50 mt-1">Per dining table session</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 space-y-4 max-w-7xl w-full mx-auto">
        {/* Filters & Search */}
        <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Bill #, table, or guest..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 text-xs pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {["all", "CASH", "UPI", "CARD"].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                  methodFilter === m
                    ? "bg-[#132A1E] text-white shadow-xs"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
              >
                {m === "all" ? "All Methods" : m}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-xs overflow-hidden">
          {loading && bills.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-400 gap-3">
              <div className="h-8 w-8 border-3 border-[#132A1E] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold">Loading payment history…</p>
            </div>
          ) : bills.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-400 gap-3">
              <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
                🧾
              </div>
              <p className="text-sm font-bold text-gray-700">No payment history found</p>
              <p className="text-xs text-gray-400 text-center max-w-sm">
                When an active table bill is paid and finalized from Table Bill panel, its receipt and payment ledger will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Bill #</th>
                    <th className="py-3.5 px-4">Table</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Subtotal</th>
                    <th className="py-3.5 px-4">Tax / Disc</th>
                    <th className="py-3.5 px-4">Total Paid</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.map((b) => {
                    const MethodIcon = PAYMENT_ICONS[b.paymentMethod] || Receipt;
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          #{b.billNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold bg-gray-100 px-2 py-0.5 rounded-md text-gray-800">
                            Table {b.tableLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-gray-900 truncate max-w-[140px]">
                            {b.customerName || "Table Guest"}
                          </p>
                          {b.customerPhone && (
                            <p className="text-[10px] text-gray-400 font-mono">{b.customerPhone}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                          <p className="font-medium text-gray-800">{formatDate(b.createdAt)}</p>
                          <p className="text-[10px] text-gray-400">{formatTime(b.createdAt)}</p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-700">
                          {formatRupees(b.subtotalCents)}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-gray-500">
                          <p>
                            {b.taxName}: {formatRupees(b.taxCents)}
                          </p>
                          {b.discountCents > 0 && (
                            <p className="text-emerald-700 font-medium">
                              Disc: -{formatRupees(b.discountCents)}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-black text-gray-900 text-sm">
                          {formatRupees(b.totalCents)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            <MethodIcon className="h-3 w-3" />
                            {b.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="h-3 w-3" /> PAID
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedBillDetail(b)}
                              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-all"
                              title="View details"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => printBill(b)}
                              className="p-1.5 rounded-lg bg-[#132A1E] text-white hover:bg-[#1C3C29] transition-all"
                              title="Print thermal bill"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs">
              <p className="text-gray-500">
                Page <span className="font-bold text-gray-900">{page}</span> of{" "}
                <span className="font-bold text-gray-900">{totalPages}</span> ({totalCount} bills)
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    const prev = Math.max(1, page - 1);
                    setPage(prev);
                    fetchBills(prev);
                  }}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    setPage(next);
                    fetchBills(next);
                  }}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedBillDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-black/10 overflow-hidden animate-scale-up">
            <div className="bg-[#132A1E] text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-amber-300">
                  Archived Payment Receipt
                </span>
                <h3 className="text-lg font-bold">Bill #{selectedBillDetail.billNumber}</h3>
                <p className="text-xs text-white/60">Table {selectedBillDetail.tableLabel} · {formatDate(selectedBillDetail.createdAt)}</p>
              </div>
              <button
                onClick={() => setSelectedBillDetail(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4 text-xs">
              {/* Customer */}
              <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Guest Details</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">
                    {selectedBillDetail.customerName || "Table Guest"}
                  </p>
                </div>
                {selectedBillDetail.customerPhone && (
                  <span className="font-mono text-gray-600 bg-white px-2 py-1 rounded-md border border-gray-200">
                    {selectedBillDetail.customerPhone}
                  </span>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase mb-2">Itemized Summary</p>
                <div className="space-y-1.5 divide-y divide-gray-100">
                  {(() => {
                    try {
                      const items = JSON.parse(selectedBillDetail.itemsJson);
                      return items.map((i: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-1.5 text-gray-700">
                          <div>
                            <span className="font-bold text-gray-900">{i.quantity}×</span> {i.name}
                          </div>
                          <span className="font-semibold text-gray-900">{formatRupees(i.subtotal)}</span>
                        </div>
                      ));
                    } catch {
                      return <p className="text-gray-400">Items could not be parsed</p>;
                    }
                  })()}
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="pt-3 border-t border-gray-200 space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatRupees(selectedBillDetail.subtotalCents)}</span>
                </div>
                {selectedBillDetail.discountCents > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount ({selectedBillDetail.discountPercent}%)</span>
                    <span>-{formatRupees(selectedBillDetail.discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>{selectedBillDetail.taxName} ({selectedBillDetail.taxPercent}%)</span>
                  <span>{formatRupees(selectedBillDetail.taxCents)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Packing & Service</span>
                  <span>{formatRupees(selectedBillDetail.packingCents)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t border-gray-200">
                  <span>Final Total Paid</span>
                  <span>{formatRupees(selectedBillDetail.totalCents)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setSelectedBillDetail(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  printBill(selectedBillDetail);
                  setSelectedBillDetail(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#132A1E] text-white font-bold hover:bg-[#1C3C29] flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="h-4 w-4" /> Thermal Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
