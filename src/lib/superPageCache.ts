type CacheEntry = { data: unknown; savedAt: number };
const cache = new Map<string, CacheEntry>();
const MAX_STALE_MS = 10 * 60_000;

export function readSuperPageCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.savedAt > MAX_STALE_MS) return null;
  return entry.data as T;
}

export function writeSuperPageCache<T>(key: string, data: T) {
  cache.set(key, { data, savedAt: Date.now() });
}
