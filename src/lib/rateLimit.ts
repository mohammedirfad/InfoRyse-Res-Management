import { createHash } from "crypto";
import Redis from "ioredis";

/**
 * Redis-backed order limits with a per-instance fallback.
 *
 * Security model:
 * - Per-table: 20 orders per 10 min to support groups ordering from one table
 * - Per-IP:    500 submissions per 10 min to avoid blocking busy shared restaurant Wi-Fi
 * - Both gates must pass for an order to go through
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const redisUrl = process.env.REDIS_URL;
const runtimeGlobal = globalThis as typeof globalThis & {
  __inforyseRateLimitRedis?: Redis;
  __inforyseRateLimitRedisRetryAt?: number;
  __inforyseRateLimitRedisWarned?: boolean;
};

function getRedis() {
  if (!redisUrl) return null;
  if (!runtimeGlobal.__inforyseRateLimitRedis) {
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1200,
      retryStrategy: () => null,
    });
    client.on("error", () => {});
    runtimeGlobal.__inforyseRateLimitRedis = client;
  }
  return runtimeGlobal.__inforyseRateLimitRedis;
}

const RATE_LIMIT_SCRIPT = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
  return { count, redis.call('PTTL', KEYS[1]) }
`;

function checkLocalRateLimit(key: string, limit: number, windowMs: number) {
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

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  return checkLocalRateLimit(key, limit, windowMs);
}

export function checkSharedRateLimit(key: string, limit: number, windowMs: number) {
  return checkSharedLimit("app", key, limit, windowMs);
}

/**
 * Per-table gate: max 3 orders per 10 minutes per table.
 * Keyed by restaurantId + tableId so Restaurant A can never affect Restaurant B.
 *
 * "global" as tableId is used by the IP gate below so it shares the same helper.
 */
export async function checkOrderRateLimit(restaurantId: string, tableId: string) {
  // IP rate limit uses key "ip:x.x.x.x" with tableId="global"
  if (restaurantId.startsWith("ip:")) {
    return checkSharedOrderLimit(restaurantId, 500, 10 * 60 * 1000); // shared Wi-Fi and multi-table ordering
  }
  // Per-table limit allows real group dining while retaining a coarse abuse guard.
  return checkSharedOrderLimit(`order:${restaurantId}:${tableId}`, 20, 10 * 60 * 1000);
}
async function checkSharedOrderLimit(key: string, limit: number, windowMs: number) {
  return checkSharedLimit("orders", key, limit, windowMs);
}

async function checkSharedLimit(namespace: string, key: string, limit: number, windowMs: number) {
  const redis = getRedis();
  if (!redis && process.env.NODE_ENV === "production" && !runtimeGlobal.__inforyseRateLimitRedisWarned) {
    runtimeGlobal.__inforyseRateLimitRedisWarned = true;
    console.error("[rate-limit] REDIS_URL is not configured; rate limits are per-instance");
  }
  if (redis && Date.now() >= (runtimeGlobal.__inforyseRateLimitRedisRetryAt ?? 0)) {
    try {
      if (redis.status === "wait") await redis.connect();
      const digest = createHash("sha256").update(`${namespace}:${key}`).digest("hex");
      const [count, ttl] = await redis.eval(RATE_LIMIT_SCRIPT, 1, `rate-limit:${namespace}:${digest}`, String(windowMs)) as [number, number];
      runtimeGlobal.__inforyseRateLimitRedisRetryAt = 0;
      runtimeGlobal.__inforyseRateLimitRedisWarned = false;
      const used = Number(count);
      return used <= limit
        ? { allowed: true, remaining: Math.max(0, limit - used) }
        : { allowed: false, remaining: 0, retryAfterMs: Math.max(0, Number(ttl)) };
    } catch (error) {
      runtimeGlobal.__inforyseRateLimitRedisRetryAt = Date.now() + 30_000;
      redis.disconnect();
      runtimeGlobal.__inforyseRateLimitRedis = undefined;
      if (!runtimeGlobal.__inforyseRateLimitRedisWarned) {
        runtimeGlobal.__inforyseRateLimitRedisWarned = true;
        console.error("[rate-limit] Redis unavailable; using per-instance order limits", error);
      }
    }
  }
  return checkLocalRateLimit(`${namespace}:${key}`, limit, windowMs);
}
