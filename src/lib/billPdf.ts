import "server-only";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { capitalizeInitials } from "@/lib/nameFormat";

export type PdfBill = {
  billNumber: number;
  tableLabel: string;
  customerName: string | null;
  customerPhone: string | null;
  subtotalCents: number;
  discountCents: number;
  discountPercent: number;
  discountName: string | null;
  taxCents: number;
  taxPercent: number;
  taxName: string;
  taxBreakdown?: unknown;
  packingCents: number;
  totalCents: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: Date;
  paidAt: Date | null;
  itemsJson: string;
  shareToken: string | null;
  restaurant: { name: string; contactPhone: string | null; location: string | null; upiPaymentId?: string | null };
};

const safe = (value: unknown) => String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim();
const money = (cents: number) => `INR ${(cents / 100).toFixed(2)}`;

export async function createBillPdf(bill: PdfBill, billUrl?: string) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 42, bottom: 42, left: 46, right: 46 },
    info: { Title: `Bill ${bill.billNumber}`, Author: safe(capitalizeInitials(bill.restaurant.name)) },
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const left = 46;
  const right = 549;
  const pageBottom = () => doc.page.height - 48;
  const rule = (y: number, color = "#d1d5db") => {
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.7).strokeColor(color).stroke();
  };
  const setCursor = (y: number) => { doc.y = y; };

  doc.font("Helvetica-Bold").fontSize(23).fillColor("#132a1e")
    .text(safe(capitalizeInitials(bill.restaurant.name)), left, doc.y, { width: right - left, align: "center" });
  if (bill.restaurant.location) {
    doc.font("Helvetica").fontSize(9).fillColor("#64748b")
      .text(safe(bill.restaurant.location), left, doc.y + 2, { width: right - left, align: "center" });
  }
  if (bill.restaurant.contactPhone) {
    doc.font("Helvetica").fontSize(9).fillColor("#64748b")
      .text(safe(bill.restaurant.contactPhone), left, doc.y + 1, { width: right - left, align: "center" });
  }
  setCursor(doc.y + 12);
  rule(doc.y);
  setCursor(doc.y + 11);

  const metaY = doc.y;
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#111827")
    .text(`BILL #${bill.billNumber}`, left, metaY, { width: 220 });
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#111827")
    .text(`TABLE ${safe(bill.tableLabel)}`, 300, metaY, { width: right - 300, align: "right" });
  setCursor(metaY + 20);

  const dateText = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
  }).format(bill.paidAt ?? bill.createdAt);
  const detailY = doc.y;
  doc.font("Helvetica").fontSize(9).fillColor("#475569")
    .text(`Date: ${dateText}`, left, detailY, { width: 310 });
  doc.font("Helvetica").fontSize(9).fillColor("#475569")
    .text(`${safe(bill.paymentStatus)} · ${safe(bill.paymentMethod)}`, 350, detailY, { width: right - 350, align: "right" });
  setCursor(detailY + 15);
  if (bill.customerName) {
    doc.font("Helvetica").fontSize(9).fillColor("#475569")
      .text(`Customer: ${safe(capitalizeInitials(bill.customerName))}`, left, doc.y, { width: right - left });
    setCursor(doc.y + 13);
  }
  setCursor(doc.y + 3);
  rule(doc.y, "#132a1e");
  setCursor(doc.y + 9);

  const columns = { itemX: left, itemWidth: 258, qtyX: 316, qtyWidth: 38, rateX: 364, rateWidth: 76, amountX: 448, amountWidth: right - 448 };
  const drawItemHeader = () => {
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#475569").text("ITEM", columns.itemX, y, { width: columns.itemWidth });
    doc.text("QTY", columns.qtyX, y, { width: columns.qtyWidth, align: "right" });
    doc.text("RATE", columns.rateX, y, { width: columns.rateWidth, align: "right" });
    doc.text("AMOUNT", columns.amountX, y, { width: columns.amountWidth, align: "right" });
    setCursor(y + 16);
    rule(doc.y);
    setCursor(doc.y + 8);
  };

  let items: { name: string; quantity: number; unitPrice: number; subtotal: number }[] = [];
  try { items = JSON.parse(bill.itemsJson); } catch { items = []; }
  drawItemHeader();
  for (const item of items) {
    const name = safe(item.name) || "Item";
    doc.font("Helvetica").fontSize(10);
    const nameHeight = doc.heightOfString(name, { width: columns.itemWidth });
    const rowHeight = Math.max(16, nameHeight);
    if (doc.y + rowHeight + 12 > pageBottom()) {
      doc.addPage();
      drawItemHeader();
    }
    const y = doc.y;
    doc.font("Helvetica").fontSize(10).fillColor("#17251d")
      .text(name, columns.itemX, y, { width: columns.itemWidth });
    doc.font("Helvetica").fontSize(9).fillColor("#475569")
      .text(String(item.quantity), columns.qtyX, y, { width: columns.qtyWidth, align: "right" });
    doc.text((item.unitPrice / 100).toFixed(2), columns.rateX, y, { width: columns.rateWidth, align: "right" });
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#17251d")
      .text((item.subtotal / 100).toFixed(2), columns.amountX, y, { width: columns.amountWidth, align: "right" });
    setCursor(y + rowHeight + 7);
    rule(doc.y, "#e5e7eb");
    setCursor(doc.y + 7);
  }

  const totals: [string, string][] = [
    ["Subtotal", money(bill.subtotalCents)],
    ...(bill.discountCents > 0 ? [[`${safe(bill.discountName || "Discount")} (${bill.discountPercent}%)`, `-${money(bill.discountCents)}`] as [string, string]] : []),
    ...((Array.isArray(bill.taxBreakdown)
      ? bill.taxBreakdown as { name: string; percent: number; amountCents: number }[]
      : [{ name: bill.taxName, percent: bill.taxPercent, amountCents: bill.taxCents }])
      .filter((line) => line.amountCents > 0)
      .map((line) => [`${safe(line.name)} (${line.percent}%)`, money(line.amountCents)] as [string, string])),
    ...(bill.packingCents > 0 ? [["Packing / service", money(bill.packingCents)] as [string, string]] : []),
  ];
  const totalsHeight = totals.length * 18 + 45;
  if (doc.y + totalsHeight > pageBottom()) doc.addPage();
  setCursor(doc.y + 5);
  for (const [label, value] of totals) {
    const y = doc.y;
    doc.font("Helvetica").fontSize(10).fillColor("#475569").text(label, left, y, { width: 330 });
    doc.font("Helvetica").fontSize(10).fillColor("#17251d").text(value, 390, y, { width: right - 390, align: "right" });
    setCursor(y + 18);
  }
  rule(doc.y + 2, "#132a1e");
  const grandY = doc.y + 10;
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#132a1e")
    .text("GRAND TOTAL", left, grandY, { width: 240 });
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#132a1e")
    .text(money(bill.totalCents), 330, grandY, { width: right - 330, align: "right" });
  setCursor(grandY + 25);

  if (billUrl) {
    const qr = await QRCode.toBuffer(billUrl, { type: "png", width: 180, margin: 1, errorCorrectionLevel: "M" });
    if (doc.y + 145 > pageBottom()) doc.addPage();
    const qrY = doc.y + 10;
    doc.image(qr, (595 - 100) / 2, qrY, { width: 100, height: 100 });
    setCursor(qrY + 104);
    doc.font("Helvetica").fontSize(9).fillColor("#64748b")
      .text("Scan to open your digital bill", left, doc.y, { width: right - left, align: "center" });
    setCursor(doc.y + 17);
  }

  if (bill.restaurant.upiPaymentId && bill.paymentStatus !== "PAID") {
    const upiUri = `upi://pay?pa=${encodeURIComponent(bill.restaurant.upiPaymentId)}&pn=${encodeURIComponent(bill.restaurant.name.slice(0, 40))}&am=${(bill.totalCents / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill ${bill.billNumber}`)}`;
    const qr = await QRCode.toBuffer(upiUri, { type: "png", width: 180, margin: 1, errorCorrectionLevel: "M" });
    if (doc.y + 130 > pageBottom()) doc.addPage();
    const qrY = doc.y + 6;
    doc.image(qr, (595 - 92) / 2, qrY, { width: 92, height: 92 });
    setCursor(qrY + 96);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#132a1e")
      .text("Scan to pay this bill by UPI", left, doc.y, { width: right - left, align: "center" });
    setCursor(doc.y + 12);
    doc.font("Helvetica").fontSize(8).fillColor("#64748b")
      .text("Payment is confirmed by restaurant staff.", left, doc.y, { width: right - left, align: "center" });
    setCursor(doc.y + 14);
  }

  if (doc.y + 24 > pageBottom()) doc.addPage();
  doc.font("Helvetica").fontSize(9).fillColor("#64748b")
      .text(`Thank you for dining with ${safe(capitalizeInitials(bill.restaurant.name))}.`, left, doc.y + 6, { width: right - left, align: "center" });
  doc.end();
  return done;
}
