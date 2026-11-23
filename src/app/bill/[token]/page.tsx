import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@/lib/db";
import QRCode from "qrcode";
import BillPrintButton from "./print-button";
import { capitalizeInitials } from "@/lib/nameFormat";
import { getPublicAppUrl } from "@/lib/appUrl";
import type { BillPdfData, BillQrMatrix } from "@/lib/clientBillPdf";

export const dynamic = "force-dynamic";

const money = (value: number) => `₹${(value / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function DigitalBillPage({ params }: { params: { token: string } }) {
  const bill = await db.bill.findUnique({
    where: { shareToken: params.token },
    include: { restaurant: { select: { name: true, contactPhone: true, location: true, gstin: true, logoUrl: true, upiPaymentId: true } } },
  });
  if (!bill) notFound();

  const billUrl = `${getPublicAppUrl()}/bill/${encodeURIComponent(params.token)}`;
  const qr = QRCode.create(billUrl, { errorCorrectionLevel: "M" });
  const billQr: BillQrMatrix = { size: qr.modules.size, data: Array.from(qr.modules.data) };
  const billQrSvg = await QRCode.toString(billUrl, {
    type: "svg",
    width: 120,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  const upiPaymentId = bill.restaurant.upiPaymentId?.trim() ?? "";
  let upiQr: BillQrMatrix | null = null;
  if (upiPaymentId && bill.paymentStatus !== "PAID") {
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiPaymentId)}&pn=${encodeURIComponent(bill.restaurant.name.slice(0, 40))}&am=${(bill.totalCents / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill ${bill.billNumber}`)}`;
    const upi = QRCode.create(upiUri, { errorCorrectionLevel: "M" });
    upiQr = { size: upi.modules.size, data: Array.from(upi.modules.data) };
  }

  let items: { name: string; quantity: number; unitPrice: number; subtotal: number }[] = [];
  try { items = JSON.parse(bill.itemsJson); } catch { notFound(); }
  const taxLines = Array.isArray(bill.taxBreakdown)
    ? bill.taxBreakdown as { name: string; percent: number; amountCents: number }[]
    : [{ name: bill.taxName, percent: bill.taxPercent, amountCents: bill.taxCents }];
  const pdfBill: BillPdfData = {
    billNumber: bill.billNumber,
    tableLabel: bill.tableLabel,
    customerName: bill.customerName,
    subtotalCents: bill.subtotalCents,
    discountCents: bill.discountCents,
    discountPercent: bill.discountPercent,
    discountName: bill.discountName,
    taxCents: bill.taxCents,
    taxPercent: bill.taxPercent,
    taxName: bill.taxName,
    taxBreakdown: bill.taxBreakdown,
    packingCents: bill.packingCents,
    totalCents: bill.totalCents,
    paymentMethod: bill.paymentMethod,
    paymentStatus: bill.paymentStatus,
    createdAt: bill.createdAt.toISOString(),
    paidAt: bill.paidAt?.toISOString() ?? null,
    itemsJson: bill.itemsJson,
    restaurant: {
      name: bill.restaurant.name,
      contactPhone: bill.restaurant.contactPhone,
      location: bill.restaurant.location,
      gstin: bill.restaurant.gstin,
      upiPaymentId: bill.restaurant.upiPaymentId,
    },
  };

  return (
    <main className="min-h-screen bg-stone-100 px-3 py-6 sm:px-6 print:min-h-0 print:bg-white print:px-0 print:py-0">
      <article className="mx-auto max-w-xl overflow-hidden rounded-3xl bg-white shadow-xl print:w-full print:max-w-none print:rounded-none print:shadow-none">
        <header className="bg-[#132A1E] px-6 py-7 text-center text-white print:bg-white print:text-black">
          {bill.restaurant.logoUrl && <Image src={bill.restaurant.logoUrl} alt="" width={56} height={56} sizes="56px" className="mx-auto mb-3 h-14 w-14 rounded-xl object-cover" />}
          <h1 className="text-2xl font-black">{capitalizeInitials(bill.restaurant.name)}</h1>
          {bill.restaurant.contactPhone && <p className="mt-1 text-sm opacity-75">{bill.restaurant.contactPhone}</p>}
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] opacity-70">Digital bill · #{bill.billNumber}</p>
        </header>

        <section className="space-y-5 p-5 sm:p-7">
          <div className="grid grid-cols-2 gap-3 border-b border-dashed border-stone-300 pb-4 text-sm">
            <div><p className="text-xs text-stone-500">Table</p><p className="font-semibold">{bill.tableLabel}</p></div>
            <div className="text-right"><p className="text-xs text-stone-500">Date & time</p><p className="font-semibold">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(bill.paidAt ?? bill.createdAt)}</p></div>
            {bill.customerName && <div><p className="text-xs text-stone-500">Customer</p><p className="font-semibold">{capitalizeInitials(bill.customerName)}</p></div>}
            <div className={bill.customerName ? "text-right" : "col-span-2"}><p className="text-xs text-stone-500">Payment</p><p className="font-semibold">{bill.paymentMethod} · {bill.paymentStatus}</p></div>
          </div>

          {(bill.restaurant.location || bill.restaurant.gstin) && <div className="-mt-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm">
            {bill.restaurant.location && <p className="text-stone-700"><span className="font-semibold text-stone-900">Location: </span>{bill.restaurant.location}</p>}
            {bill.restaurant.gstin && <p className="mt-1 text-stone-700"><span className="font-semibold text-stone-900">GSTIN: </span>{bill.restaurant.gstin}</p>}
          </div>}

          <div className="overflow-hidden rounded-xl border border-stone-200">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-stone-50 px-3 py-2 text-[11px] font-bold uppercase text-stone-500">
              <span>Item</span><span>Qty</span><span className="text-right">Amount</span>
            </div>
            {items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="grid grid-cols-[1fr_auto_auto] gap-3 border-t border-stone-100 px-3 py-3 text-sm">
                <div className="min-w-0"><p className="font-semibold text-stone-900">{capitalizeInitials(item.name)}</p><p className="text-xs text-stone-500">{money(item.unitPrice)} each</p></div>
                <span>{item.quantity}</span><span className="text-right font-medium">{money(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-stone-600"><span>Subtotal</span><span>{money(bill.subtotalCents)}</span></div>
            {bill.discountCents > 0 && <div className="flex justify-between text-emerald-700"><span>{bill.discountName || "Discount"} ({bill.discountPercent}%)</span><span>−{money(bill.discountCents)}</span></div>}
            {taxLines.filter((line) => line.amountCents > 0).map((line, index) => <div key={`${line.name}-${index}`} className="flex justify-between text-stone-600"><span>{line.name} ({line.percent}%)</span><span>{money(line.amountCents)}</span></div>)}
            {bill.packingCents > 0 && <div className="flex justify-between text-stone-600"><span>Packing</span><span>{money(bill.packingCents)}</span></div>}
            <div className="flex justify-between border-t-2 border-stone-900 pt-3 text-lg font-black"><span>Grand total</span><span>{money(bill.totalCents)}</span></div>
          </div>

          <p className="text-center text-[11px] text-stone-400">Thank you for dining with us.</p>
          <div className="hidden print:flex print:flex-col print:items-center print:gap-2 print:border-t print:border-stone-200 print:pt-4">
            <div aria-label="QR code linking to this digital bill" dangerouslySetInnerHTML={{ __html: billQrSvg }} />
            <p className="text-center text-[10px] text-stone-500">Scan to open this digital bill</p>
          </div>
        </section>
        <footer className="border-t border-stone-100 bg-stone-50 p-4 text-center print:hidden"><BillPrintButton bill={pdfBill} billQr={billQr} upiQr={upiQr} fileName={`bill-${bill.billNumber}.pdf`} /></footer>
      </article>
    </main>
  );
}
