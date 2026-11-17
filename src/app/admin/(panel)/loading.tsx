export default function AdminPanelLoading() {
  return (
    <div role="status" aria-label="Loading admin section" className="space-y-5 p-5 sm:p-7">
      <div className="h-9 w-56 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-white" />)}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-slate-100 bg-white" />
    </div>
  );
}
