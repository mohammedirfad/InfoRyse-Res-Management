"use client";

export default function AdminRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    /Loading chunk|ChunkLoadError|is not a function|Importing a module script failed|Failed to fetch dynamically imported module/i.test(
      `${error?.name} ${error?.message}`,
    );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 text-center shadow-2xl">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl"
          aria-hidden
        >
          ⚠️
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          {isChunkError
            ? "InfoRyse was updated"
            : "The admin panel could not load"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          {isChunkError
            ? "A new version was released while your panel was open. Reload to continue — live orders keep flowing to your kitchen in the meantime."
            : "We could not open the admin shell. Your restaurant data is safe; reload to try again."}
        </p>
        {error?.message && (
          <p className="mt-3 break-words rounded-xl bg-stone-50 px-3 py-2 font-mono text-[11px] text-stone-500">
            {error.message}
            {error.digest ? ` · ref ${error.digest}` : ""}
          </p>
        )}
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => {
              if (isChunkError) {
                window.location.reload();
                return;
              }
              try {
                reset();
              } catch {
                window.location.reload();
              }
            }}
            className="min-h-11 w-full rounded-xl bg-[#132A1E] px-4 py-3 text-sm font-bold text-white"
          >
            {isChunkError ? "Reload panel" : "Try again"}
          </button>
          <a
            href="/admin/login"
            className="min-h-11 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to sign in
          </a>
        </div>
      </div>
    </main>
  );
}
