import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { buildCustomerMenuUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const restaurant = await db.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    const tables = await db.table.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: { label: "asc" },
    });
    return Response.json({
      tables: tables.map((t) => ({ ...t, menuUrl: buildCustomerMenuUrl(restaurant.slug, t.qrToken) })),
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
