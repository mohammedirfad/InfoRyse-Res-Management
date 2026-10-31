import { db } from "@/lib/db";
import { invalidateRestaurantActiveCache, requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";
import { invalidatePublicMenu } from "@/lib/publicMenuCache";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const restaurant = await db.restaurant.findUniqueOrThrow({ where: { id: params.id } });
    const updated = await db.restaurant.update({
      where: { id: restaurant.id },
      data: { isActive: !restaurant.isActive },
    });
    invalidateRestaurantActiveCache(updated.id);
    invalidatePublicMenu(updated.id);
    return Response.json({ restaurant: updated });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
