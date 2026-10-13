import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name:            z.string().min(1).max(100).optional(),
  openNow:         z.boolean().optional(),
  taxName:         z.string().max(30).optional(),
  taxPercent:      z.number().min(0).max(30).optional(),
  discountActive:  z.boolean().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountName:    z.string().max(100).optional(),
});

export async function GET() {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId } });
    return Response.json({ restaurant });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const body = PatchSchema.parse(await req.json());
    const updated = await db.restaurant.update({
      where: { id: restaurantId },
      data:  body,
    });
    return Response.json({ restaurant: updated });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
