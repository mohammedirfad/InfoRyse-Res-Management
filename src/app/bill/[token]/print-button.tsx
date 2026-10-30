"use client";

import { Download } from "lucide-react";

export default function BillPrintButton({ pdfUrl }: { pdfUrl: string }) {
  return (
    <a href={pdfUrl} className="inline-flex items-center gap-2 rounded-xl bg-[#132A1E] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a3828]">
      <Download className="h-4 w-4" /> Download / print bill as PDF
    </a>
  );
}
