"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, UtensilsCrossed } from "lucide-react";

/**
 * Root error boundary. Anything thrown while rendering (including a stale
 * client chunk after a deploy) lands here instead of the raw Next overlay.
 *
 * A stale chunk is the single most common cause: the user has an old page open
 * when a new build is released, so a lazily-loaded module no longer exists on
 * the server. Reloading fixes that, so the primary action is a hard reload of
 * the same URL (which re-fetches the current chunk graph).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app:error]", error);
  }, [error]);

  const isChunkError =
    /Loading chunk|ChunkLoadError|is not a function|Importing a module script failed|Failed to fetch dynamically imported module/i.test(
      `${error?.name} ${error?.message}`,
    );

  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const inAdmin = path.startsWith("/admin");

  return (
    <div className="min-h-screen bg-[#FBF7F1] flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-7 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-center text-xl font-black tracking-tight text-[#132A1E]">
          {isChunkError ? "This page needs a refresh" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-gray-500">
          {isChunkError
            ? "The app was updated while this page was open. Reloading will bring you right back — nothing you did has been lost."
            : "We hit an unexpected problem while loading this screen. Your orders and table tab are safe on our servers."}
        </p>

        {error?.message && (
          <details className="mt-4 rounded-2xl bg-stone-50 p-3 text-xs text-stone-500">
            <summary className="cursor-pointer font-semibold text-stone-600">
              Technical details
            </summary>
            <p className="mt-2 break-words font-mono text-[11px] leading-relaxed">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-1 font-mono text-[10px] text-stone-400">
                ref: {error.digest}
              </p>
            )}
          </details>
        )}

        <div className="mt-6 grid gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && isChunkError) {
                window.location.reload();
                return;
              }
              try {
                reset();
              } catch {
                window.location.reload();
              }
            }}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#132A1E] px-4 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" />{" "}
            {isChunkError ? "Reload page" : "Try again"}
          </button>
          <Link
            href={
              inAdmin
                ? "/admin/dashboard"
                : path.split("/").slice(0, 4).join("/") || "/"
            }
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <UtensilsCrossed className="h-4 w-4" />{" "}
            {inAdmin ? "Back to dashboard" : "Back to menu"}
          </Link>
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-400">
          Still stuck? Call a staff member — your order is with the kitchen.
        </p>
      </div>
    </div>
  );
}
