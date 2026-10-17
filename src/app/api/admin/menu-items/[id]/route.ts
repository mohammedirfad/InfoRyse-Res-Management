import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { invalidatePublicMenu } from "@/lib/publicMenuCache";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  isAvailable:  z.boolean().optional(),
  priceCents:   z.number().int().min(0).optional(),
  name:         z.string().min(1).max(100).optional(),
  description:  z.string().max(1000).nullable().optional(),
  categoryId:   z.string().min(1).optional(),
  isVeg:        z.boolean().optional(),
  imageUrl:     z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const body = PatchSchema.parse(await req.json());

    const item = await db.menuItem.findFirst({ where: { id: params.id, restaurantId } });
    if (!item) return Response.json({ error: "Not found" }, { status: 404 });

    const updated = await db.menuItem.update({ where: { id: item.id }, data: body });
    invalidatePublicMenu(restaurantId);
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
    invalidatePublicMenu(restaurantId);
    return Response.json({ ok: true });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
