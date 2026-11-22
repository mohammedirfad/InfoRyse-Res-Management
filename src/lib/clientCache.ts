"use client";

import { adminCacheKey, cachedJson, invalidateCache as invalidateCachedData } from "@/lib/cachedFetch";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

/** All client data reads use the shared TanStack Query-backed cache. */
export async function cachedFetch<T = unknown>(url: string, ttlSeconds = 30, init?: RequestInit): Promise<T> {
  if (init && (init.method ?? "GET").toUpperCase() !== "GET") {
    const response = await fetchWithRetry(url, { cache: "no-store", ...init }, { retries: 0 });
    const data = await response.json().catch(() => null) as T | null;
    if (!response.ok) throw new Error((data as { error?: string } | null)?.error ?? `Request failed (${response.status})`);
    return data as T;
  }
  const { data } = await cachedJson<T>(adminCacheKey(url), url, { ttlMs: ttlSeconds * 1000 });
  return data;
}

export function invalidateCache(url: string) {
  invalidateCachedData(adminCacheKey(url));
}
