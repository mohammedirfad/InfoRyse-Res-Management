import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const orders = await db.order.findMany({
      where: { restaurantId },
      include: {
        items: true,
        table: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    // Short cache — 4s is enough to batch rapid re-fetches during polling
    // without making new orders feel stale (admin polls every 7s anyway)
    return new Response(JSON.stringify({ orders }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=4, stale-while-revalidate=8",
      },
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
