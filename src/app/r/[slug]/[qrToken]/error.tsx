"use client";

export default function GuestFlowError({
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
    <div className="flex min-h-[70vh] items-center justify-center bg-[#FBF7F1] px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-6 text-center shadow-sm">
        <div className="text-5xl" aria-hidden>
          🍽️
        </div>
        <h1 className="mt-4 text-lg font-bold text-gray-900">
          {isChunkError
            ? "Almost there — one refresh"
            : "We couldn't open this screen"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          {isChunkError
            ? "The app was updated just now. Reload to continue — your cart and table tab are saved on this device."
            : "Nothing has been lost. Your cart is saved and any order you placed is already with the kitchen."}
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
            className="min-h-11 w-full rounded-2xl bg-[#132A1E] px-4 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            {isChunkError ? "Reload" : "Try again"}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to a fresh page
          </button>
        </div>
        <p className="mt-4 text-[11px] text-gray-400">
          Need help? Call a staff member at your table.
        </p>
      </div>
    </div>
  );
}
