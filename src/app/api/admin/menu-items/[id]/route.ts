import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  isAvailable: z.boolean().optional(),
  priceCents:  z.number().int().min(0).optional(),
  name:        z.string().optional(),
  description: z.string().optional(),
  categoryId:  z.string().optional(),
  isVeg:       z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const body = PatchSchema.parse(await req.json());

    const item = await db.menuItem.findFirst({ where: { id: params.id, restaurantId } });
    if (!item) return Response.json({ error: "Not found" }, { status: 404 });

    const updated = await db.menuItem.update({ where: { id: item.id }, data: body });
    return Response.json({ item: updated });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const item = await db.menuItem.findFirst({ where: { id: params.id, restaurantId } });
    if (!item) return Response.json({ error: "Not found" }, { status: 404 });
    await db.menuItem.update({ where: { id: item.id }, data: { deletedAt: new Date() } });
    return Response.json({ ok: true });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
