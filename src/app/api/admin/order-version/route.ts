import { db } from "@/lib/db";
import { requireFastRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/** Tiny tenant-scoped change token used to recover updates missed by realtime. */
export async function GET() {
  try {
    const { restaurantId } = await requireFastRestaurantUser();
    const latest = await db.order.findFirst({
      where: { restaurantId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    return Response.json(
      { version: latest?.updatedAt.toISOString() ?? null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
