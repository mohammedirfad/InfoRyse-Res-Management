"use client";

import { useState } from "react";
import { Printer, Download } from "lucide-react";

export default function BillPrintButton({ pdfUrl, fileName }: { pdfUrl: string; fileName: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function downloadPdf() {
    if (downloading) return;
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(pdfUrl, { cache: "no-store" });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.toLowerCase().includes("application/pdf")) {
        setError("PDF download is temporarily unavailable. Use Print / Save as PDF below.");
        return;
      }

      const blob = await response.blob();
      if (blob.size < 8) throw new Error("The PDF response was empty.");
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch {
      setError("PDF download is temporarily unavailable. Use Print / Save as PDF below.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" disabled={downloading} onClick={downloadPdf} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#132A1E] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1a3828] disabled:cursor-wait disabled:opacity-70">
          <Download className="h-4 w-4" /> {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
      <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#132A1E]/20 bg-white px-5 py-3 text-sm font-bold text-[#132A1E] hover:bg-stone-100">
        <Printer className="h-4 w-4" /> Print / Save as PDF
      </button>
      </div>
      {error && <p role="status" className="max-w-sm text-center text-xs text-rose-700">{error}</p>}
    </div>
  );
}
