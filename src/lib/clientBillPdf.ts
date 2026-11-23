import { capitalizeInitials } from "@/lib/nameFormat";

export type BillPdfData = {
  billNumber: number;
  tableLabel: string;
  customerName: string | null;
  subtotalCents: number;
  discountCents: number;
  discountPercent: number;
  discountName: string | null;
  taxCents: number;
  taxPercent: number;
  taxName: string;
  taxBreakdown: unknown;
  packingCents: number;
  totalCents: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  paidAt: string | null;
  itemsJson: string;
  restaurant: { name: string; contactPhone: string | null; location: string | null; gstin: string | null; upiPaymentId: string | null };
};

export type BillQrMatrix = { size: number; data: number[] };

const printable = (value: unknown) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\x20-\x7e]/g, "?")
  .trim();

const escaped = (value: unknown) => printable(value)
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)");

const money = (cents: number) => `INR ${(Number(cents || 0) / 100).toFixed(2)}`;

function wrap(value: string, maxChars: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (word.length > maxChars) {
      if (line) lines.push(line);
      for (let i = 0; i < word.length; i += maxChars) lines.push(word.slice(i, i + maxChars));
      line = "";
      continue;
    }
    if (line && `${line} ${word}`.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function textCommand(text: string, x: number, y: number, size: number, bold = false, color = "0.09 0.14 0.11") {
  return `${color} rg BT /F${bold ? 2 : 1} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escaped(text)}) Tj ET`;
}

function qrCommands(matrix: BillQrMatrix, x: number, bottom: number, size: number) {
  if (!matrix || !Number.isInteger(matrix.size) || matrix.size < 1 || matrix.data.length !== matrix.size * matrix.size) return [];
  const quiet = 4;
  const cell = size / (matrix.size + quiet * 2);
  const commands = ["0 0 0 rg"];
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.data[row * matrix.size + col]) {
        const px = x + (col + quiet) * cell;
        const py = bottom + size - (row + quiet + 1) * cell;
        commands.push(`${px.toFixed(3)} ${py.toFixed(3)} ${(cell + 0.08).toFixed(3)} ${(cell + 0.08).toFixed(3)} re f`);
      }
    }
  }
  return commands;
}

export function createBillPdfBytes(bill: BillPdfData, billQr: BillQrMatrix, upiQr?: BillQrMatrix | null) {
  const pages: string[][] = [];
  let commands: string[] = [];
  let y = 790;
  const left = 46;
  const right = 549;
  const line = (at: number, color = "0.82 0.84 0.83") => {
    commands.push(`${color} RG 0.7 w ${left} ${at.toFixed(2)} m ${right} ${at.toFixed(2)} l S`);
  };
  const addText = (value: string, x: number, baseline: number, size: number, bold = false, color?: string) => {
    commands.push(textCommand(value, x, baseline, size, bold, color));
  };
  const addItemsHeader = () => {
    addText("ITEM", left, y, 9, true, "0.28 0.34 0.30");
    addText("QTY", 374, y, 9, true, "0.28 0.34 0.30");
    addText("AMOUNT", 466, y, 9, true, "0.28 0.34 0.30");
    y -= 10;
    line(y);
    y -= 18;
  };
  const startPage = (continued = false, itemHeader = true) => {
    commands = [];
    pages.push(commands);
    y = 790;
    if (!continued) {
      commands.push("0.07 0.16 0.11 rg 0 742 595 100 re f");
      addText(printable(capitalizeInitials(bill.restaurant.name)), 46, y, 22, true, "1 1 1");
      y -= 19;
      if (bill.restaurant.contactPhone) {
        addText(printable(bill.restaurant.contactPhone), 46, y, 9, false, "0.85 0.90 0.86");
        y -= 13;
      }
      y = 718;
      addText(`BILL #${bill.billNumber}`, left, y, 13, true);
      addText(`TABLE ${printable(bill.tableLabel)}`, 390, y, 11, true);
      y -= 18;
      const dateText = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(bill.paidAt ?? bill.createdAt));
      addText(`Date: ${dateText}`, left, y, 9, false, "0.28 0.34 0.30");
      addText(`${printable(bill.paymentStatus)} | ${printable(bill.paymentMethod)}`, 350, y, 9, false, "0.28 0.34 0.30");
      y -= 18;
      const addressLines = bill.restaurant.location ? wrap(`Location: ${printable(bill.restaurant.location)}`, 90) : [];
      for (const addressLine of addressLines) {
        addText(addressLine, left, y, 9, false, "0.28 0.34 0.30");
        y -= 12;
      }
      if (bill.restaurant.gstin) {
        addText(`GSTIN: ${printable(bill.restaurant.gstin)}`, left, y, 9, false, "0.28 0.34 0.30");
        y -= 14;
      }
      if (bill.customerName) {
        addText(`Customer: ${printable(bill.customerName)}`, left, y, 9, false, "0.28 0.34 0.30");
        y -= 14;
      }
      line(y);
      y -= 20;
    } else {
      addText(`BILL #${bill.billNumber} (CONTINUED)`, left, y, 13, true);
      y -= 28;
    }
    if (itemHeader) addItemsHeader();
  };

  startPage();
  let items: Array<{ name?: unknown; quantity?: unknown; unitPrice?: unknown; subtotal?: unknown }> = [];
  try {
    const parsed: unknown = JSON.parse(bill.itemsJson);
    if (Array.isArray(parsed)) items = parsed.filter((item) => item && typeof item === "object");
  } catch { /* Keep an empty item list if a legacy bill has invalid JSON. */ }

  for (const item of items) {
    const nameLines = wrap(printable(capitalizeInitials(String(item.name ?? ""))) || "Item", 43);
    const rowHeight = nameLines.length * 13 + 22;
    if (y - rowHeight < 110) startPage(true);
    nameLines.forEach((part, index) => addText(part, left, y - index * 12, 10));
    const detailY = y - nameLines.length * 12 - 1;
    addText(`${money(Number(item.unitPrice) || 0)} each`, left, detailY, 8, false, "0.38 0.42 0.40");
    addText(String(item.quantity ?? 0), 380, y, 9);
    addText(money(Number(item.subtotal) || 0), 448, y, 9, true);
    y -= rowHeight;
    line(y, "0.90 0.91 0.90");
    y -= 12;
  }

  const taxes = Array.isArray(bill.taxBreakdown)
    ? (bill.taxBreakdown as Array<{ name?: unknown; percent?: unknown; amountCents?: unknown }>)
        .filter((entry) => entry && Number(entry.amountCents) > 0)
        .map((entry) => [`${printable(entry.name || "Tax")} (${Number(entry.percent) || 0}%)`, money(Number(entry.amountCents) || 0)] as const)
    : bill.taxCents > 0 ? [[`${printable(bill.taxName)} (${bill.taxPercent}%)`, money(bill.taxCents)] as const] : [];
  const totals: Array<readonly [string, string]> = [
    ["Subtotal", money(bill.subtotalCents)],
    ...(bill.discountCents > 0 ? [[`${printable(bill.discountName || "Discount")} (${bill.discountPercent}%)`, `-${money(bill.discountCents)}`] as const] : []),
    ...taxes,
    ...(bill.packingCents > 0 ? [["Packing / service", money(bill.packingCents)] as const] : []),
  ];
  const extraQrHeight = upiQr && bill.paymentStatus !== "PAID" ? 290 : 150;
  if (y - (totals.length * 18 + 52 + extraQrHeight) < 40) startPage(true, false);
  y -= 5;
  for (const [label, value] of totals) {
    addText(label, left, y, 10, false, "0.28 0.34 0.30");
    addText(value, 420, y, 10);
    y -= 18;
  }
  line(y + 2, "0.07 0.16 0.11");
  y -= 18;
  addText("GRAND TOTAL", left, y, 15, true, "0.07 0.16 0.11");
  addText(money(bill.totalCents), 390, y, 15, true, "0.07 0.16 0.11");
  y -= 30;

  if (y < 145) startPage(true, false);
  const qrSize = 92;
  const qrX = (595 - qrSize) / 2;
  commands.push(...qrCommands(billQr, qrX, y - qrSize, qrSize));
  y -= qrSize + 14;
  addText("Scan to open this digital bill", left, y, 9, false, "0.38 0.42 0.40");
  y -= 24;
  if (upiQr && bill.paymentStatus !== "PAID") {
    if (y < 145) startPage(true, false);
    commands.push(...qrCommands(upiQr, qrX, y - qrSize, qrSize));
    y -= qrSize + 12;
    addText("Scan to pay by UPI", left, y, 9, true, "0.07 0.16 0.11");
    y -= 20;
  }
  addText(`Thank you for dining with ${printable(bill.restaurant.name)}.`, left, y, 9, false, "0.38 0.42 0.40");

  const pageObjects: number[] = [];
  const objects: string[] = [];
  const addObject = (value: string) => { objects.push(value); return objects.length; };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const regularFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  pages.forEach((pageCommands, index) => {
    pageCommands.push(textCommand(`Bill #${bill.billNumber} | Page ${index + 1}`, left, 28, 8, false, "0.45 0.48 0.46"));
    const stream = pageCommands.join("\n");
    const streamId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject("");
    pageObjects.push(pageId);
    objects[pageId - 1] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${streamId} 0 R >>`;
  });
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageObjects.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjects.length} >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index++) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
