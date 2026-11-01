"use client";

/**
 * Tiny client-side cache used by every admin screen (and the guest pages that
 * need a warm menu).
 *
 * Why it exists: every admin tab is a client component that used to start from
 * an empty screen and wait for one (sometimes three) API round-trips before it
 * could paint anything. With a Supabase pooler + a serverless cold start that
 * meant 20–30 s of "did the click work?".
 *
 * With this layer:
 *  - data is kept in memory AND in sessionStorage, so a tab paints instantly
 *    from the previous snapshot (even right after a reload or an HMR refresh);
 *  - the network refresh happens in the background and replaces the snapshot;
 *  - concurrent callers share one in-flight request (4 pages never fire 4 copies
 *    of the same query);
 *  - `invalidate()` is called after every mutation so the next read is fresh.
 */

type Entry = { data: unknown; savedAt: number };

const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Prefix for every key we store so the namespace can be cleared in one go. */
const STORAGE_PREFIX = "inforyse:cache:";

export type CachedFetchOptions = {
  /** How long a snapshot may be used while a refresh runs in the background. */
  ttlMs?: number;
  /** Hard ceiling — never paint data older than this, even while offline. */
  maxStaleMs?: number;
  /** Start the request in the background without awaiting it. */
  prefetch?: boolean;
};

const DEFAULT_TTL = 60_000;
const DEFAULT_MAX_STALE = 30 * 60_000;

function readStorage(key: string): Entry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry;
    if (typeof parsed?.savedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(key: string, entry: Entry) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch { /* Storage may be full or disabled — memory cache still works. */ }
}

/** Last snapshot we have for a key, or null. Synchronous: safe in useState(). */
export function peekCache<T>(key: string, maxStaleMs = DEFAULT_MAX_STALE): T | null {
  const entry = memory.get(key) ?? readStorage(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > maxStaleMs) return null;
  return entry.data as T;
}

/** Write a value that came back from the server (or from an optimistic update). */
export function writeCache<T>(key: string, data: T) {
  const entry: Entry = { data, savedAt: Date.now() };
  memory.set(key, entry);
  writeStorage(key, entry);
}

/** Drop every cached response (used by keys that start with the prefix). */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    memory.clear();
    if (typeof window !== "undefined") {
      try {
        for (const key of Object.keys(window.sessionStorage)) {
          if (key.startsWith(STORAGE_PREFIX)) window.sessionStorage.removeItem(key);
        }
      } catch { /* ignore */ }
    }
    return;
  }
  for (const key of [...memory.keys()]) if (key.startsWith(prefix)) memory.delete(key);
  if (typeof window !== "undefined") {
    try {
      for (const key of Object.keys(window.sessionStorage)) {
        if (key.startsWith(STORAGE_PREFIX + prefix)) window.sessionStorage.removeItem(key);
      }
    } catch { /* ignore */ }
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (payload as { error?: string } | null)?.error ?? `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

/**
 * Cache-first JSON GET. Returns the cached snapshot immediately when it is warm
 * (and refreshes in the background), otherwise waits for the network.
 */
export async function cachedJson<T>(
  key: string,
  url: string,
  options: CachedFetchOptions = {},
): Promise<{ data: T; fromCache: boolean }> {
  const { ttlMs = DEFAULT_TTL, maxStaleMs = DEFAULT_MAX_STALE, prefetch = false } = options;
  const entry = memory.get(key) ?? readStorage(key);
  const fresh = entry && Date.now() - entry.savedAt < ttlMs;

  if (fresh) {
    if (entry) memory.set(key, entry);
    if (prefetch) void fetchJsonCached<T>(key, url, { maxStaleMs });
    return { data: entry!.data as T, fromCache: true };
  }

  const data = await fetchJsonCached<T>(key, url, { maxStaleMs });
  return { data, fromCache: false };
}

/** Always hits the network (deduplicated) and updates the cache. */
export function fetchJsonCached<T>(
  key: string,
  url: string,
  options: { maxStaleMs?: number } = {},
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = requestJson<T>(url)
    .then((data) => {
      writeCache(key, data);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

/** Fire-and-forget warm-up. Failures are silent: the page will fetch on demand. */
export function prefetchJson(key: string, url: string) {
  const entry = memory.get(key);
  if (entry && Date.now() - entry.savedAt < 15_000) return;
  void fetchJsonCached(key, url).catch(() => {});
}

/** Small helper for admin endpoints — all keys share one namespace per route. */
export function adminCacheKey(restaurantScopedPath: string) {
  return `admin:${restaurantScopedPath}`;
}
