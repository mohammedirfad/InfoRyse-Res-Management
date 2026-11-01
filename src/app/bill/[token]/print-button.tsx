"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";

export default function BillPrintButton({ pdfUrl }: { pdfUrl: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function downloadPdf() {
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(pdfUrl, { cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
        throw new Error("The PDF could not be downloaded. Please try printing the bill instead.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `bill-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The PDF could not be downloaded.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#132A1E]/20 bg-white px-5 py-3 text-sm font-bold text-[#132A1E] hover:bg-stone-100">
          <Printer className="h-4 w-4" /> Print bill
        </button>
        <button type="button" onClick={downloadPdf} disabled={downloading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#132A1E] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a3828] disabled:cursor-wait disabled:opacity-60">
          <Download className="h-4 w-4" /> {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>
      {error && <p role="alert" className="max-w-sm text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
