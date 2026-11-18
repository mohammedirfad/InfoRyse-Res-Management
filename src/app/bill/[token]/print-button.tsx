"use client";

import { Download, Printer } from "lucide-react";
import { createBillPdfBytes, type BillPdfData, type BillQrMatrix } from "@/lib/clientBillPdf";

export default function BillPrintButton({ bill, billQr, upiQr, fileName }: { bill: BillPdfData; billQr: BillQrMatrix; upiQr: BillQrMatrix | null; fileName: string }) {
  function downloadPdf() {
    const bytes = createBillPdfBytes(bill, billQr, upiQr);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function savePdf() {
    const previousTitle = document.title;
    document.title = fileName.replace(/\.pdf$/i, "");
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 1000);
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button type="button" onClick={downloadPdf} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#132A1E] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a3828]">
        <Download className="h-4 w-4" /> Download PDF
      </button>
      <button type="button" onClick={savePdf} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#132A1E] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a3828]">
        <Printer className="h-4 w-4" /> Print / Save as PDF
      </button>
    </div>
  );
}
