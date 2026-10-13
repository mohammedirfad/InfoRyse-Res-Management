"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Printer,
  CheckCircle,
  RefreshCw,
  Receipt,
  Users,
  Clock,
  Search,
  Sparkles,
  UtensilsCrossed,
  ArrowRight,
  Download,
  CreditCard,
  DollarSign,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  X,
  History,
  FileText,
} from "lucide-react";
import { formatRupees, formatTime, formatDate } from "@/lib/utils";

type AggregatedItem = { name: string; unitPrice: number; quantity: number; subtotal: number };
type OrderSummary = {
  id: string;
  orderNumber: number;
  status: string;
  createdAt: string;
  customerName: string | null;
  subtotal: number;
  items: { nameSnapshot: string; priceCentsSnapshot: number; quantity: number }[];
};

type Session = {
  id: string;
  status: string;
  createdAt: string;
  orderCount: number;
  orders: OrderSummary[];
  aggregatedItems: AggregatedItem[];
  subtotalCents: number;
  discountCents?: number;
  discountPercent?: number;
  discountName?: string | null;
  taxPercent?: number;
  taxName?: string;
  taxCents?: number;
  packingCents?: number;
  totalCents?: number;
};

type Table = {
  id: string;
  label: string;
  section: string | null;
  status: string;
  hasActiveSession?: boolean;
  activeOrderCount?: number;
  activeSubtotalCents?: number;
};

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

const ORDER_STATUS_COLOR: Record<string, string> = {
  NEW: "text-amber-500 bg-amber-50 border-amber-200",
  ACCEPTED: "text-blue-600 bg-blue-50 border-blue-200",
  PREPARING: "text-indigo-600 bg-indigo-50 border-indigo-200",
  READY: "text-emerald-600 bg-emerald-50 border-emerald-200",
  COMPLETED: "text-green-700 bg-green-50 border-green-200",
  CANCELLED: "text-gray-400 bg-gray-50 border-gray-200",
};

const PAYMENT_ICONS: Record<string, any> = {
  CASH: DollarSign,
  UPI: Smartphone,
  CARD: CreditCard,
  OTHER: Receipt,
};

export default function BillPage() {
  const [activeTab, setActiveTab]           = useState<"live" | "history">("live");

  // ── Live Tables Billing State ──
  const [tables, setTables]                 = useState<Table[]>([]);
  const [selectedTable, setSelectedTable]   = useState<Table | null>(null);
  const [session, setSession]               = useState<Session | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [taxName, setTaxName]               = useState("GST");
  const [taxPercent, setTaxPercent]         = useState(5);
  const [loading, setLoading]               = useState(false);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [tableFilter, setTableFilter]       = useState<"active" | "all">("active");
  const [tableSearch, setTableSearch]       = useState("");

  // Payment Settlement Modal State
  const [settlingPayment, setSettlingPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "OTHER">("CASH");
  const [customerNameInput, setCustomerNameInput]         = useState("");
  const [customerPhoneInput, setCustomerPhoneInput]       = useState("");
  const [isSubmittingBill, setIsSubmittingBill]           = useState(false);

  // ── Bills & Payment History State ──
  const [bills, setBills]                   = useState<StoredBill[]>([]);
  const [billsLoading, setBillsLoading]     = useState(false);
  const [billsPage, setBillsPage]           = useState(1);
  const [billsTotalPages, setBillsTotalPages] = useState(1);
  const [billsTotalCount, setBillsTotalCount] = useState(0);
  const [billsTotalRevenue, setBillsTotalRevenue] = useState(0);
  const [billsSearch, setBillsSearch]       = useState("");
  const [billsMethodFilter, setBillsMethodFilter] = useState("all");
  const [selectedBillDetail, setSelectedBillDetail] = useState<StoredBill | null>(null);

  const selectedTableRef = useRef<Table | null>(null);
  selectedTableRef.current = selectedTable;

  // Fetch tables and restaurant config
  const fetchTablesAndRestaurant = useCallback(async (isInitial = false) => {
    try {
      setIsRefreshing(true);
      const [tablesRes, meRes] = await Promise.all([
        fetch("/api/admin/tables", { cache: "no-store" }),
        fetch("/api/admin/me", { cache: "no-store" }),
      ]);

      const [tablesData, meData] = await Promise.all([
        tablesRes.json(),
        meRes.json(),
      ]);

      const loadedTables: Table[] = tablesData.tables ?? [];
      setTables(loadedTables);

      if (meData?.restaurant) {
        setRestaurantName(meData.restaurant.name ?? "");
        setTaxName(meData.restaurant.taxName ?? "GST");
        setTaxPercent(meData.restaurant.taxPercent ?? 5);
      }

      if (isInitial && !selectedTableRef.current) {
        const firstActive = loadedTables.find(
          (t) => (t.activeOrderCount ?? 0) > 0 || t.status === "OCCUPIED"
        );
        if (firstActive) {
          loadBill(firstActive);
        } else if (loadedTables.length > 0) {
          loadBill(loadedTables[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch tables:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch specific table bill
  const loadBill = useCallback(async (table: Table, silent = false) => {
    setSelectedTable(table);
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/admin/table-bill/${table.id}`, { cache: "no-store" });
      const data = await res.json();
      setSession(data.session ?? null);
      if (data.restaurant) {
        setTaxName(data.restaurant.taxName ?? "GST");
        setTaxPercent(data.restaurant.taxPercent ?? 5);
      }
    } catch (err) {
      console.error("Failed to load table bill:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Fetch historical bills (10 per page)
  const fetchBills = useCallback(async (targetPage = billsPage) => {
    try {
      setBillsLoading(true);
      const query = new URLSearchParams({
        page: targetPage.toString(),
        limit: "10",
        search: billsSearch,
        paymentMethod: billsMethodFilter,
      });

      const res = await fetch(`/api/admin/bills?${query.toString()}`, { cache: "no-store" });
      const data = await res.json();

      setBills(data.bills ?? []);
      setBillsTotalPages(data.pagination?.totalPages ?? 1);
      setBillsTotalCount(data.pagination?.total ?? 0);
      setBillsTotalRevenue(data.totalRevenueCents ?? 0);
    } catch (err) {
      console.error("Failed to fetch bills:", err);
    } finally {
      setBillsLoading(false);
    }
  }, [billsPage, billsSearch, billsMethodFilter]);

  // Initial load
  useEffect(() => {
    fetchTablesAndRestaurant(true);
    fetchBills(1);
  }, [fetchTablesAndRestaurant, fetchBills]);

  // Live Auto-Refresh (Polling every 3.5s when on Live tab)
  useEffect(() => {
    if (activeTab !== "live") return;
    const interval = setInterval(() => {
      fetchTablesAndRestaurant(false);
      if (selectedTableRef.current) {
        loadBill(selectedTableRef.current, true);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [activeTab, fetchTablesAndRestaurant, loadBill]);

  // Trigger Settle Payment modal
  function openPaymentModal() {
    if (!session || !selectedTable) return;
    const firstOrderCustomer = session.orders.find((o) => o.customerName)?.customerName ?? "";
    setCustomerNameInput(firstOrderCustomer);
    setSelectedPaymentMethod("CASH");
    setSettlingPayment(true);
  }

  // Confirm payment, store bill in database, and print
  async function confirmPaymentAndStoreBill() {
    if (!session || !selectedTable) return;
    setIsSubmittingBill(true);

    const subtotal = session.subtotalCents;
    const discount = session.discountCents ?? 0;
    const discounted = Math.max(0, subtotal - discount);
    const tax = session.taxCents ?? Math.round(discounted * taxPercent / 100);
    const packing = session.packingCents ?? 2000;
    const total = session.totalCents ?? (discounted + tax + packing);

    try {
      const res = await fetch("/api/admin/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTable.id,
          tableSessionId: session.id,
          tableLabel: selectedTable.label,
          customerName: customerNameInput.trim() || undefined,
          customerPhone: customerPhoneInput.trim() || undefined,
          orderCount: session.orderCount,
          subtotalCents: subtotal,
          discountCents: discount,
          discountPercent: session.discountPercent ?? 0,
          discountName: session.discountName ?? null,
          taxCents: tax,
          taxPercent: session.taxPercent ?? taxPercent,
          taxName: session.taxName ?? taxName,
          packingCents: packing,
          totalCents: total,
          paymentMethod: selectedPaymentMethod,
          items: session.aggregatedItems,
        }),
      });

      const data = await res.json();
      if (data.bill) {
        printBill(data.bill.billNumber);
      }

      setSettlingPayment(false);
      await fetchTablesAndRestaurant(false);
      await loadBill(selectedTable);
      fetchBills(1);
    } catch (err) {
      console.error("Failed to store bill:", err);
    } finally {
      setIsSubmittingBill(false);
    }
  }

  // Print thermal bill
  function printBill(billNumOverride?: number) {
    if (!session || !selectedTable) return;
    const subtotal = session.subtotalCents;
    const discount = session.discountCents ?? 0;
    const discounted = Math.max(0, subtotal - discount);
    const tax = session.taxCents ?? Math.round(discounted * taxPercent / 100);
    const packing = session.packingCents ?? 2000;
    const total = session.totalCents ?? (discounted + tax + packing);

    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Official Bill — Table ${selectedTable.label}</title>
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
      ${billNumOverride ? `<div class="r"><b>BILL #${billNumOverride}</b><span>${selectedPaymentMethod} · PAID</span></div>` : ""}
      <div class="r"><b>Table: ${selectedTable.label}</b><span>${new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></div>
      <div class="r"><span>Date:</span><span>${new Date().toLocaleDateString("en-IN")}</span></div>
      <div class="r"><span>Orders in Tab:</span><span>${session.orderCount}</span></div>
      <div class="d"></div>
      <b>Ordered Items:</b>
      ${session.aggregatedItems.map((i) => `
        <div class="r"><span>${i.name} ×${i.quantity}</span><span>₹${(i.subtotal/100).toFixed(0)}</span></div>
      `).join("")}
      <div class="d"></div>
      <div class="r"><span>Subtotal:</span><span>₹${(subtotal/100).toFixed(0)}</span></div>
      ${discount > 0 ? `<div class="r disc"><span>Discount (${session.discountName || "Offer"} ${session.discountPercent}%):</span><span>−₹${(discount/100).toFixed(0)}</span></div>` : ""}
      <div class="r"><span>${session.taxName || taxName} (${session.taxPercent ?? taxPercent}%):</span><span>₹${(tax/100).toFixed(0)}</span></div>
      <div class="r"><span>Packing & Service:</span><span>₹${(packing/100).toFixed(0)}</span></div>
      <div class="t"><span>FINAL TOTAL:</span><span>₹${(total/100).toFixed(0)}</span></div>
      <div class="f"><div class="d"></div><p>Thank you for dining with us!</p><p style="margin-top:4px">Powered by InfoRyse</p></div>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }

  // Print single past stored bill from history
  function printPastBill(b: StoredBill) {
    let parsedItems: AggregatedItem[] = [];
    try {
      parsedItems = JSON.parse(b.itemsJson);
    } catch { /* ignore */ }

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
      <div class="r"><b>Table: ${b.tableLabel}</b><span>${new Date(b.createdAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></div>
      <div class="r"><span>Date:</span><span>${new Date(b.createdAt).toLocaleDateString("en-IN")}</span></div>
      ${b.customerName ? `<div class="r"><span>Customer:</span><span>${b.customerName}</span></div>` : ""}
      <div class="d"></div>
      <b>Ordered Items:</b>
      ${parsedItems.map((i) => `
        <div class="r"><span>${i.name} ×${i.quantity}</span><span>₹${(i.subtotal/100).toFixed(0)}</span></div>
      `).join("")}
      <div class="d"></div>
      <div class="r"><span>Subtotal:</span><span>₹${(b.subtotalCents/100).toFixed(0)}</span></div>
      ${b.discountCents > 0 ? `<div class="r disc"><span>Discount (${b.discountName || "Offer"} ${b.discountPercent}%):</span><span>−₹${(b.discountCents/100).toFixed(0)}</span></div>` : ""}
      <div class="r"><span>${b.taxName} (${b.taxPercent}%):</span><span>₹${(b.taxCents/100).toFixed(0)}</span></div>
      <div class="r"><span>Packing & Service:</span><span>₹${(b.packingCents/100).toFixed(0)}</span></div>
      <div class="t"><span>FINAL TOTAL:</span><span>₹${(b.totalCents/100).toFixed(0)}</span></div>
      <div class="f"><div class="d"></div><p>Thank you for dining with us!</p><p style="margin-top:4px">Powered by InfoRyse</p></div>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }

  // Export full bills history to CSV
  async function exportBillsToCSV() {
    try {
      const res = await fetch("/api/admin/bills?export=true", { cache: "no-store" });
      const data = await res.json();
      const all: StoredBill[] = data.bills ?? [];

      const headers = ["Bill #", "Table", "Customer", "Date", "Time", "Items Subtotal", "Discount", "Tax", "Packing", "Total Paid", "Payment Method", "Status"];
      const rows = all.map((b) => [
        `"#${b.billNumber}"`,
        `"Table ${b.tableLabel}"`,
        `"${b.customerName || "Table Guest"}"`,
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

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `restaurant_bills_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export bills:", err);
    }
  }

  // Filtered tables for live view
  const displayedTables = tables.filter((t) => {
    const matchesSearch = t.label.toLowerCase().includes(tableSearch.toLowerCase()) ||
      (t.section && t.section.toLowerCase().includes(tableSearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (tableFilter === "active") {
      return (t.activeOrderCount ?? 0) > 0 || t.status === "OCCUPIED";
    }
    return true;
  });

  const activeTablesCount = tables.filter(
    (t) => (t.activeOrderCount ?? 0) > 0 || t.status === "OCCUPIED"
  ).length;

  const subtotal   = session?.subtotalCents ?? 0;
  const discount   = session?.discountCents ?? 0;
  const discounted = Math.max(0, subtotal - discount);
  const tax        = session?.taxCents ?? Math.round(discounted * taxPercent / 100);
  const packing    = session?.packingCents ?? (subtotal > 0 ? 2000 : 0);
  const grandTotal = session?.totalCents ?? (discounted + tax + packing);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 flex-col">

      {/* ── Top Navigation Bar: Live Tables vs All Bills History ────────────── */}
      <div className="bg-[#132A1E] text-white px-6 py-3.5 flex items-center justify-between border-b border-white/10 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-base tracking-tight">Billing & POS</span>
          </div>

          <div className="flex bg-white/10 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("live")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "live"
                  ? "bg-amber-400 text-gray-950 font-black shadow-xs"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <span>Live Tables Billing</span>
              {activeTablesCount > 0 && (
                <span className="bg-black/20 px-1.5 py-0.5 rounded-full text-[10px]">
                  {activeTablesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("history");
                fetchBills(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "history"
                  ? "bg-amber-400 text-gray-950 font-black shadow-xs"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>All Bills & Payment History</span>
              {billsTotalCount > 0 && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                  {billsTotalCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === "history" && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportBillsToCSV}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export All Bills CSV
            </button>
          </div>
        )}
      </div>

      {/* ── TAB 1: LIVE TABLES BILLING ────────────────────────────────────────── */}
      {activeTab === "live" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Table selector sidebar */}
          <div className="w-80 flex-shrink-0 bg-white border-r border-black/5 flex flex-col overflow-hidden shadow-xs">
            <div className="p-4 border-b border-black/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span>Active Tables</span>
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                      {activeTablesCount} Live
                    </span>
                  </h2>
                  <p className="text-[11px] text-gray-400">Select table to view running tab</p>
                </div>
                <button
                  onClick={() => {
                    fetchTablesAndRestaurant(false);
                    if (selectedTable) loadBill(selectedTable);
                  }}
                  className={`p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all ${
                    isRefreshing ? "opacity-60" : ""
                  }`}
                  title="Refresh tables"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search table or section…"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full bg-gray-50 text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setTableFilter("active")}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    tableFilter === "active" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Active ({activeTablesCount})
                </button>
                <button
                  onClick={() => setTableFilter("all")}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    tableFilter === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  All Tables ({tables.length})
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {displayedTables.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <UtensilsCrossed className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-700">No tables found</p>
                  <p className="text-[11px] text-gray-400 mt-1">No tables currently have open orders</p>
                </div>
              ) : (
                displayedTables.map((t) => {
                  const isSelected = selectedTable?.id === t.id;
                  const hasOrders = (t.activeOrderCount ?? 0) > 0;
                  const isOccupied = t.status === "OCCUPIED" || hasOrders;

                  return (
                    <button
                      key={t.id}
                      onClick={() => loadBill(t)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all border ${
                        isSelected
                          ? "bg-[#132A1E] text-white border-[#132A1E] shadow-md"
                          : isOccupied
                          ? "bg-white hover:bg-emerald-50/50 border-emerald-200 text-gray-800"
                          : "bg-white hover:bg-gray-50 border-gray-100 text-gray-600"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : isOccupied
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {t.label}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold truncate">Table {t.label}</p>
                          <p className={`text-[10px] truncate ${isSelected ? "text-white/60" : "text-gray-400"}`}>
                            {t.section ? `${t.section} · ` : ""}
                            {hasOrders ? (
                              <span className={isSelected ? "text-amber-300 font-semibold" : "text-emerald-700 font-semibold"}>
                                {t.activeOrderCount} {t.activeOrderCount === 1 ? "order" : "orders"}
                              </span>
                            ) : isOccupied ? (
                              <span className={isSelected ? "text-white/70" : "text-amber-600"}>Occupied</span>
                            ) : (
                              "Available"
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2">
                        {hasOrders && (t.activeSubtotalCents ?? 0) > 0 ? (
                          <span className={`text-xs font-black block ${isSelected ? "text-amber-300" : "text-gray-900"}`}>
                            {formatRupees(t.activeSubtotalCents ?? 0)}
                          </span>
                        ) : isOccupied ? (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"}`}>
                            Active
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-400">Empty</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Bill panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedTable ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3">
                <Receipt className="h-16 w-16 text-gray-300" />
                <div className="text-center">
                  <p className="font-bold text-base text-gray-700">Select a table</p>
                  <p className="text-xs text-gray-400 mt-1">Choose any table from the sidebar to inspect running orders</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-[#132A1E] to-[#1C3C29] text-white px-6 py-4 flex-shrink-0 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold">Table {selectedTable.label}</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/15 text-white">
                          {selectedTable.section ?? "Main Dining"}
                        </span>
                        {session && session.orderCount > 0 && (
                          <span className="flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            {session.orderCount} Active {session.orderCount === 1 ? "Round" : "Rounds"}
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 text-xs mt-1">
                        {loading
                          ? "Refreshing bill data…"
                          : session && session.orderCount > 0
                          ? `Running tab consolidated across all table guests`
                          : "No orders placed for this table yet"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadBill(selectedTable)}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
                        title="Refresh current bill"
                      >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      </button>

                      {session && session.orderCount > 0 && (
                        <>
                          <button
                            onClick={() => printBill()}
                            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-xs"
                          >
                            <Printer className="h-4 w-4" /> Print Thermal Bill
                          </button>

                          <button
                            onClick={openPaymentModal}
                            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs font-black px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-md"
                          >
                            <CheckCircle className="h-4 w-4" /> Settle Payment & Close Table
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {loading && !session ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="h-8 w-8 border-3 border-[#132A1E] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !session || session.orders.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 p-8">
                    <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-3xl">🍽️</div>
                    <p className="font-bold text-gray-800 text-base">No active orders for Table {selectedTable.label}</p>
                    <p className="text-xs text-gray-500 max-w-sm text-center">
                      When guests scan the table QR and place an order, it will appear here in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Individual Rounds */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Individual Orders ({session.orders.length} Rounds)
                        </p>
                        <span className="text-[11px] text-gray-500">Started: {formatTime(session.createdAt)}</span>
                      </div>

                      {session.orders.map((o, idx) => (
                        <div key={o.id} className="bg-white rounded-2xl border border-black/5 shadow-xs overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/60 border-b border-black/5">
                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded-md bg-[#132A1E] text-white text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-gray-900 text-xs">Round {idx + 1} · #{o.orderNumber}</span>
                              {o.customerName && <span className="text-[11px] text-gray-500">· {o.customerName}</span>}
                            </div>
                            <span className="text-[10px] font-bold text-gray-500">{formatTime(o.createdAt)}</span>
                          </div>

                          <div className="p-3.5 space-y-1.5">
                            {o.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs text-gray-700">
                                <span><b className="font-bold text-gray-900">{item.quantity}×</b> {item.nameSnapshot}</span>
                                <span className="font-semibold text-gray-900">{formatRupees(item.priceCentsSnapshot * item.quantity)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 text-xs">
                              <span>Round Subtotal</span>
                              <span>{formatRupees(o.subtotal)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Consolidated Final Bill Breakdown */}
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Consolidated Bill</p>

                      <div className="bg-white rounded-2xl border border-black/5 shadow-xs overflow-hidden">
                        <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between bg-gray-50/60">
                          <span className="font-bold text-gray-900 text-xs">All Dishes ({session.aggregatedItems.length})</span>
                          <span className="text-xs text-gray-400">Total Qty: {session.aggregatedItems.reduce((s, i) => s + i.quantity, 0)}</span>
                        </div>
                        <div className="p-4 space-y-2 divide-y divide-gray-50">
                          {session.aggregatedItems.map((item, i) => (
                            <div key={i} className="flex items-center justify-between pt-1.5 first:pt-0 text-xs">
                              <div>
                                <p className="font-semibold text-gray-900">{item.name}</p>
                                <p className="text-[10px] text-gray-400">{item.quantity} × {formatRupees(item.unitPrice)}</p>
                              </div>
                              <span className="font-bold text-gray-900">{formatRupees(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Financial breakdown */}
                      <div className="bg-white border border-[#132A1E]/15 rounded-3xl p-5 shadow-xs space-y-3.5">
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between text-gray-600">
                            <span>Items Subtotal</span>
                            <span className="font-semibold text-gray-900">{formatRupees(subtotal)}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                              <span>{session.discountName || "Special Offer"} ({session.discountPercent}% OFF)</span>
                              <span>−{formatRupees(discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-gray-600">
                            <span>{session.taxName || taxName} ({session.taxPercent ?? taxPercent}%)</span>
                            <span className="font-semibold text-gray-900">{formatRupees(tax)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Packing & Service</span>
                            <span className="font-semibold text-gray-900">{formatRupees(packing)}</span>
                          </div>
                          <div className="flex justify-between font-black text-[#132A1E] text-2xl pt-2 border-t border-gray-100">
                            <span>Total Payable</span>
                            <span>{formatRupees(grandTotal)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={() => printBill()}
                            className="flex items-center justify-center gap-1.5 border border-gray-300 hover:border-gray-800 text-gray-800 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all"
                          >
                            <Printer className="h-4 w-4" /> Print Thermal Bill
                          </button>

                          <button
                            onClick={openPaymentModal}
                            className="flex items-center justify-center gap-1.5 bg-[#132A1E] hover:bg-[#1a3828] text-white py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md"
                          >
                            <CheckCircle className="h-4 w-4 text-emerald-400" /> Settle Payment
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: ALL BILLS & PAYMENT HISTORY (10 PER PAGE PAGINATED) ────────── */}
      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Bills Settled</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{billsTotalCount}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Revenue Collected</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{formatRupees(billsTotalRevenue)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Average Ticket Size</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {billsTotalCount > 0 ? formatRupees(Math.round(billsTotalRevenue / billsTotalCount)) : "₹0"}
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
            <div className="relative w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Bill #, Table, or Customer…"
                value={billsSearch}
                onChange={(e) => {
                  setBillsSearch(e.target.value);
                  setBillsPage(1);
                }}
                className="w-full bg-gray-50 text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(["all", "CASH", "UPI", "CARD"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setBillsMethodFilter(m);
                    setBillsPage(1);
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    billsMethodFilter === m
                      ? "bg-[#132A1E] text-white shadow-xs"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  {m === "all" ? "All Methods" : m}
                </button>
              ))}
            </div>
          </div>

          {/* Bills Table (10 per page) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3.5">Bill #</th>
                    <th className="px-4 py-3.5">Table</th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Date & Time</th>
                    <th className="px-4 py-3.5 text-right">Subtotal</th>
                    <th className="px-4 py-3.5 text-right">Discount</th>
                    <th className="px-4 py-3.5 text-right">GST Tax</th>
                    <th className="px-4 py-3.5 text-right">Total Paid</th>
                    <th className="px-4 py-3.5 text-center">Payment Mode</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {billsLoading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12">
                        <div className="h-6 w-6 border-2 border-[#132A1E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-gray-400 font-semibold">Loading bills history…</p>
                      </td>
                    </tr>
                  ) : bills.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12">
                        <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-gray-700">No bills generated yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          When you settle and close tables in the Live Tables tab, bills will be saved here automatically.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    bills.map((b) => {
                      const Icon = PAYMENT_ICONS[b.paymentMethod] ?? Receipt;
                      return (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedBillDetail(b)}
                          className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3.5 font-bold text-gray-900">
                            #{b.billNumber}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-bold bg-gray-100 px-2 py-0.5 rounded-md text-gray-800">
                              Table {b.tableLabel}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-medium text-gray-800">
                            {b.customerName || "Table Guest"}
                          </td>

                          <td className="px-4 py-3.5 text-gray-500">
                            {formatDate(b.createdAt)} · {formatTime(b.createdAt)}
                          </td>

                          <td className="px-4 py-3.5 text-right font-medium text-gray-600">
                            {formatRupees(b.subtotalCents)}
                          </td>

                          <td className="px-4 py-3.5 text-right font-medium text-emerald-700">
                            {b.discountCents > 0 ? `−${formatRupees(b.discountCents)}` : "—"}
                          </td>

                          <td className="px-4 py-3.5 text-right font-medium text-gray-600">
                            {formatRupees(b.taxCents)}
                          </td>

                          <td className="px-4 py-3.5 text-right font-black text-gray-900 text-sm">
                            {formatRupees(b.totalCents)}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Icon className="w-3 h-3" />
                              {b.paymentMethod}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                printPastBill(b);
                              }}
                              className="text-gray-500 hover:text-gray-900 font-bold p-1 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Print thermal bill"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBillDetail(b);
                              }}
                              className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                            >
                              Details →
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (10 at a time) */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <p className="text-xs text-gray-500 font-medium">
                Showing <b className="text-gray-900">{bills.length}</b> of{" "}
                <b className="text-gray-900">{billsTotalCount}</b> bills (Page {billsPage} of {billsTotalPages})
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setBillsPage((p) => Math.max(1, p - 1))}
                  disabled={billsPage <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>

                {Array.from({ length: billsTotalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, billsPage - 3), Math.min(billsTotalPages, billsPage + 2))
                  .map((pNum) => (
                    <button
                      key={pNum}
                      onClick={() => setBillsPage(pNum)}
                      className={`h-7 w-7 text-xs font-bold rounded-lg transition-all ${
                        billsPage === pNum
                          ? "bg-[#132A1E] text-white shadow-xs"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}

                <button
                  onClick={() => setBillsPage((p) => Math.min(billsTotalPages, p + 1))}
                  disabled={billsPage >= billsTotalPages}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SETTLE PAYMENT & CLOSE TABLE ──────────────────────────────── */}
      {settlingPayment && session && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#132A1E] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Settle Bill & Confirm Payment</h3>
                <p className="text-white/60 text-xs">Table {selectedTable.label} · Final Closure</p>
              </div>
              <button
                onClick={() => setSettlingPayment(false)}
                className="p-1.5 rounded-lg text-white/70 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Amount Box */}
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Total Amount Due</p>
                  <p className="text-2xl font-black text-gray-950 mt-0.5">{formatRupees(grandTotal)}</p>
                </div>
                <div className="text-right text-[11px] text-gray-500">
                  <p>Subtotal: {formatRupees(subtotal)}</p>
                  {discount > 0 && <p className="text-emerald-700">Disc: −{formatRupees(discount)}</p>}
                  <p>Tax ({taxPercent}%): {formatRupees(tax)}</p>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "CASH", label: "Cash", icon: DollarSign },
                    { id: "UPI", label: "UPI / QR", icon: Smartphone },
                    { id: "CARD", label: "Debit/Credit Card", icon: CreditCard },
                    { id: "OTHER", label: "Other / Split", icon: Receipt },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = selectedPaymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(m.id as any)}
                        className={`flex items-center gap-2 p-3 rounded-2xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-[#132A1E] bg-[#132A1E]/5 font-extrabold text-[#132A1E]"
                            : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Customer Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={customerNameInput}
                  onChange={(e) => setCustomerNameInput(e.target.value)}
                  className="w-full bg-gray-50 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex gap-2">
              <button
                onClick={() => setSettlingPayment(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPaymentAndStoreBill}
                disabled={isSubmittingBill}
                className="flex-1 bg-[#132A1E] hover:bg-[#1a3828] text-white py-3 rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                {isSubmittingBill ? "Settling…" : "Confirm Paid & Print Bill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER: HISTORICAL BILL DETAILS ──────────────────────────────────── */}
      {selectedBillDetail && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setSelectedBillDetail(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#132A1E] text-white">
              <div>
                <h3 className="font-bold text-base">Bill #{selectedBillDetail.billNumber}</h3>
                <p className="text-xs text-white/60">Table {selectedBillDetail.tableLabel} · {selectedBillDetail.paymentMethod}</p>
              </div>
              <button
                onClick={() => setSelectedBillDetail(null)}
                className="p-2 rounded-xl text-white/70 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Summary Banner */}
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total Paid</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">{formatRupees(selectedBillDetail.totalCents)}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-xs">
                  {selectedBillDetail.paymentStatus}
                </span>
              </div>

              {/* Info details */}
              <div className="space-y-1.5 text-xs text-gray-600 border-b border-gray-100 pb-3">
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span className="font-semibold text-gray-900">{formatDate(selectedBillDetail.createdAt)} at {formatTime(selectedBillDetail.createdAt)}</span>
                </div>
                {selectedBillDetail.customerName && (
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-semibold text-gray-900">{selectedBillDetail.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-semibold text-gray-900">{selectedBillDetail.paymentMethod}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Itemized Breakdown</h4>
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/60 divide-y divide-gray-100">
                  {(() => {
                    let items: AggregatedItem[] = [];
                    try {
                      items = JSON.parse(selectedBillDetail.itemsJson);
                    } catch { /* ignore */ }
                    return items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1.5 first:pt-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-gray-900">{it.name}</p>
                          <p className="text-[10px] text-gray-400">{it.quantity} × {formatRupees(it.unitPrice)}</p>
                        </div>
                        <span className="font-bold text-gray-900">{formatRupees(it.subtotal)}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Tax & Discount Breakdown */}
              <div className="space-y-1.5 text-xs border-t border-gray-100 pt-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>{formatRupees(selectedBillDetail.subtotalCents)}</span>
                </div>
                {selectedBillDetail.discountCents > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount ({selectedBillDetail.discountPercent}%):</span>
                    <span>−{formatRupees(selectedBillDetail.discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>{selectedBillDetail.taxName} ({selectedBillDetail.taxPercent}%):</span>
                  <span>{formatRupees(selectedBillDetail.taxCents)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Packing & Service:</span>
                  <span>{formatRupees(selectedBillDetail.packingCents)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t border-gray-100">
                  <span>Final Total:</span>
                  <span>{formatRupees(selectedBillDetail.totalCents)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
              <button
                onClick={() => printPastBill(selectedBillDetail)}
                className="flex-1 bg-[#132A1E] text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4" /> Re-print Thermal Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
