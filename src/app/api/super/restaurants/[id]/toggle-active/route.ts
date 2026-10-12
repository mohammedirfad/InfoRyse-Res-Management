import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const restaurant = await db.restaurant.findUniqueOrThrow({ where: { id: params.id } });
    const updated = await db.restaurant.update({
      where: { id: restaurant.id },
      data: { isActive: !restaurant.isActive },
    });
    return Response.json({ restaurant: updated });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
