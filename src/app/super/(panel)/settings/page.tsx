"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Database, Mail, RefreshCw, XCircle } from "lucide-react";

type Status = { database: "connected"; emailProvider: "Resend" | "SMTP" | null; checkedAt: string };

export default function SuperSettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/super/system-status", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to check system configuration.");
      setStatus(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to check system configuration."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  return <main className="min-h-[calc(100dvh-3.5rem)] p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold text-slate-900">System Configuration</h1><p className="mt-1 text-sm text-slate-500">Live checks of the database and outbound email configuration.</p></div><button onClick={load} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>Refresh</button></header>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="mt-6 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
      <article className="card p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Database className="h-5 w-5"/></span><div><h2 className="font-semibold text-slate-900">Database</h2><p className="text-xs text-slate-500">Current application database connection</p></div></div><div className="mt-5 flex items-center gap-2 text-sm">{status?.database === "connected" ? <><CheckCircle2 className="h-4 w-4 text-emerald-600"/><span className="font-medium text-emerald-800">Connected</span></> : <><XCircle className="h-4 w-4 text-slate-400"/><span className="text-slate-500">{loading ? "Checking…" : "Not verified"}</span></>}</div></article>
      <article className="card p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><Mail className="h-5 w-5"/></span><div><h2 className="font-semibold text-slate-900">Outbound email</h2><p className="text-xs text-slate-500">Provider availability from server environment</p></div></div><div className="mt-5 flex items-center gap-2 text-sm">{status?.emailProvider ? <><CheckCircle2 className="h-4 w-4 text-emerald-600"/><span className="font-medium text-emerald-800">{status.emailProvider} configured</span></> : <><XCircle className="h-4 w-4 text-rose-600"/><span className="font-medium text-rose-700">Not configured · email cannot be delivered</span></>}</div></article>
    </section>
    {status && <p className="mt-4 text-xs text-slate-400">Checked {new Date(status.checkedAt).toLocaleString("en-IN")}. Secrets are not exposed here.</p>}
    <aside className="mt-6 max-w-4xl rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">Previous platform settings displayed sample values and a Save button that did not persist them. Those controls have been removed. Persistent platform preferences need a settings data model and API before they can be safely edited here.</aside>
  </main>;
}
