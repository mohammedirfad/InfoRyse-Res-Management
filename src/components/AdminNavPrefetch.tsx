"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The admin sidebar is a client component, so Next ships the RSC payload for
 * each tab only once its <Link> mounts. We additionally warm the tab the
 * moment a pointer lands on it (or keyboard focus moves to it), which makes
 * the click open the route with an already-painted shell.
 */
export default function AdminNavPrefetch() {
  const router = useRouter();

  useEffect(() => {
    const handled = new WeakSet<HTMLElement>();
    const warm = (target: EventTarget | null) => {
      const link = (target as HTMLElement | null)?.closest?.(
        "a[href^='/admin/']",
      ) as HTMLAnchorElement | null;
      if (!link || handled.has(link)) return;
      handled.add(link);
      router.prefetch(link.getAttribute("href") ?? "");
    };
    const onPointerOver = (event: Event) => warm(event.target);
    const onPointerDown = (event: Event) => warm(event.target);
    const onFocusIn = (event: Event) => warm(event.target);
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [router]);

  return null;
}
