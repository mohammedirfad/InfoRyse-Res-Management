import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const meCache = new Map<string, { data: any; ts: number }>();
const ME_CACHE_TTL = 15000; // 15 seconds

export async function GET() {
  try {
    const { userId, restaurantId, role } = await requireRestaurantUser();

    const cacheKey = `${userId}:${restaurantId}`;
    const cached = meCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.ts < ME_CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
        },
      });
    }

    const restaurant = await db.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    const payload = { userId, role, restaurant };

    meCache.set(cacheKey, { data: payload, ts: now });

    return new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
