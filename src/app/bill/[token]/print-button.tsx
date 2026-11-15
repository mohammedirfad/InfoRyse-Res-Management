"use client";

import { useState } from "react";
import { Download, LoaderCircle, Printer } from "lucide-react";

export default function BillPrintButton({ pdfUrl }: { pdfUrl: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function downloadPdf() {
    if (downloading) return;
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(pdfUrl, { cache: "no-store" });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/pdf")) throw new Error("PDF unavailable");
      const blob = await response.blob();
      if (!blob.size) throw new Error("Empty PDF");
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `bill-${Date.now()}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setError("Direct download failed. Use Print / Save as PDF below.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" disabled={downloading} onClick={() => void downloadPdf()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#132A1E] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a3828] disabled:cursor-wait disabled:opacity-70">
          {downloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#132A1E]/20 bg-white px-5 py-3 text-sm font-bold text-[#132A1E] hover:bg-stone-100">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>
      {error && <p role="alert" className="max-w-sm text-center text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}
