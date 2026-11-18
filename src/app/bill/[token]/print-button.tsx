"use client";

import { Download } from "lucide-react";

export default function BillPrintButton({ fileName }: { fileName: string }) {
  function savePdf() {
    const previousTitle = document.title;
    document.title = fileName.replace(/\.pdf$/i, "");
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 1000);
  }

  return (
    <div>
      <button type="button" onClick={savePdf} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#132A1E] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a3828]">
        <Download className="h-4 w-4" /> Download PDF
      </button>
    </div>
  );
}
