import { ClipboardList, Info } from "lucide-react";

export default function AuditLogsPage() {
  return <main className="min-h-[calc(100dvh-3.5rem)] p-4 sm:p-6">
    <header><h1 className="text-xl font-bold text-slate-900">Audit Logs</h1><p className="mt-1 text-sm text-slate-500">Recorded platform actions and security events.</p></header>
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
      <div className="flex items-start gap-3"><Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/><div><h2 className="font-semibold text-amber-950">No audit records are stored yet</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-amber-900">This project does not currently have an audit-log database table or API. The sample activity previously shown here was not real and has been removed. No user, IP address, session, or action history is available to display.</p></div></div>
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-amber-200/80 bg-white/70 p-4 text-sm text-slate-600"><ClipboardList className="h-4 w-4 shrink-0"/>To show real audit history, the application needs to record events when users sign in or change platform data.</div>
    </section>
  </main>;
}
