/**
 * In-memory rate limiter — keyed per bucket.
 *
 * ⚠️  Single-instance only. On Vercel / multi-instance, swap the Map for
 * Upstash Redis so counters are shared. For a single-VPS pilot this is fine.
 *
 * Security model:
 * - Per-table: 20 orders per 10 min to support groups ordering from one table
 * - Per-IP:    500 submissions per 10 min to avoid blocking busy shared restaurant Wi-Fi
 * - Both gates must pass for an order to go through
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt < now) buckets.delete(bucketKey);
  }
  const b   = buckets.get(key);

  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (b.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }

  b.count += 1;
  return { allowed: true, remaining: limit - b.count };
}

/**
 * Per-table gate: max 3 orders per 10 minutes per table.
 * Keyed by restaurantId + tableId so Restaurant A can never affect Restaurant B.
 *
 * "global" as tableId is used by the IP gate below so it shares the same helper.
 */
export function checkOrderRateLimit(restaurantId: string, tableId: string) {
  // IP rate limit uses key "ip:x.x.x.x" with tableId="global"
  if (restaurantId.startsWith("ip:")) {
    return checkRateLimit(restaurantId, 500, 10 * 60 * 1000); // shared Wi-Fi and multi-table ordering
  }
  // Per-table limit allows real group dining while retaining a coarse abuse guard.
  return checkRateLimit(`order:${restaurantId}:${tableId}`, 20, 10 * 60 * 1000);
}
