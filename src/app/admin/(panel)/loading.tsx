export default function AdminPanelLoading() {
  return (
    <div role="status" aria-live="polite" className="min-h-[calc(100dvh-3.5rem)] bg-slate-50 p-4 sm:p-6">
      <span className="sr-only">Loading admin page</span>
      <div className="mb-5 h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />)}
      </div>
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">Loading your restaurant workspace…</p>
    </div>
  );
}
