/**
 * Lightweight in-memory + sessionStorage cache for client-side fetch calls.
 * Prevents re-fetching the same data on every component mount.
 *
 * Usage:
 *   const data = await cachedFetch("/api/admin/menu-items", 30); // 30s TTL
 */

interface CacheEntry {
  data: unknown;
  ts:   number; // Date.now()
}

// In-memory store (survives React re-renders, cleared on page reload)
const memCache = new Map<string, CacheEntry>();

export async function cachedFetch<T = unknown>(
  url: string,
  ttlSeconds = 30,
  init?: RequestInit
): Promise<T> {
  const key  = url;
  const now  = Date.now();
  const ttlMs = ttlSeconds * 1000;

  // 1. Memory cache (fastest)
  const mem = memCache.get(key);
  if (mem && now - mem.ts < ttlMs) return mem.data as T;

  // 2. sessionStorage cache (survives component unmount)
  try {
    const raw = sessionStorage.getItem(`cache_${key}`);
    if (raw) {
      const entry: CacheEntry = JSON.parse(raw);
      if (now - entry.ts < ttlMs) {
        memCache.set(key, entry);
        return entry.data as T;
      }
    }
  } catch { /* ignore */ }

  // 3. Fetch from network
  const res  = await fetch(url, { cache: "no-store", ...init });
  const data = await res.json() as T;

  const entry: CacheEntry = { data, ts: now };
  memCache.set(key, entry);
  try { sessionStorage.setItem(`cache_${key}`, JSON.stringify(entry)); } catch { /* quota */ }

  return data;
}

/** Invalidate a URL so next call goes to network */
export function invalidateCache(url: string) {
  memCache.delete(url);
  try { sessionStorage.removeItem(`cache_${url}`); } catch { /* ignore */ }
}
