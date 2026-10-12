import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId, restaurantId, role } = await requireRestaurantUser();
    const restaurant = await db.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    return Response.json({ userId, role, restaurant });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
