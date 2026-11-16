"use client";

import { Printer, Download } from "lucide-react";

export default function BillPrintButton({ pdfUrl }: { pdfUrl: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <a href={pdfUrl} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#132A1E] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a3828]">
        <Download className="h-4 w-4" /> Download PDF
      </a>
      <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#132A1E]/20 bg-white px-5 py-3 text-sm font-bold text-[#132A1E] hover:bg-stone-100">
        <Printer className="h-4 w-4" /> Print / Save as PDF
      </button>
    </div>
  );
}
