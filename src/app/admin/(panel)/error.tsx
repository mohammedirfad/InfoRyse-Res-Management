"use client";

export default function AdminPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError = /Loading chunk|ChunkLoadError|is not a function|Importing a module script failed|Failed to fetch dynamically imported module/i
    .test(`${error?.name} ${error?.message}`);

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-lg rounded-3xl border border-amber-200 bg-white p-7 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <span className="text-xl" aria-hidden>⚠️</span>
        </div>
        <h2 className="mt-4 text-lg font-bold text-gray-900">
          {isChunkError ? "This tab needs a refresh" : "This screen could not load"}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
          {isChunkError
            ? "A new version of the dashboard was released while this tab was open. Reload the tab — the notification feed and open orders are unaffected."
            : "The dashboard hit an unexpected problem. Your orders, bills and menu data are safe."}
        </p>
        {error?.message && (
          <p className="mt-3 break-words rounded-xl bg-stone-50 px-3 py-2 font-mono text-[11px] text-stone-500">
            {error.message}
            {error.digest ? ` · ref ${error.digest}` : ""}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (isChunkError) { window.location.reload(); return; }
              try { reset(); } catch { window.location.reload(); }
            }}
            className="rounded-xl bg-[#132A1E] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1a3828]"
          >
            {isChunkError ? "Reload the dashboard" : "Try again"}
          </button>
          <a
            href="/admin/orders"
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
          >
            Go to live orders
          </a>
        </div>
      </div>
    </div>
  );
}
