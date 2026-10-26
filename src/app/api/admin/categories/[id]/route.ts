import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { invalidatePublicMenu } from "@/lib/publicMenuCache";

export const dynamic = "force-dynamic";

const RenameSchema = z.object({ name: z.string().trim().min(1, "Category name is required").max(60) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const { name } = RenameSchema.parse(await req.json());
    const category = await db.category.findFirst({
      where: { id: params.id, restaurantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!category) return Response.json({ error: "Category not found" }, { status: 404 });

    const duplicate = await db.category.findFirst({
      where: { restaurantId, deletedAt: null, id: { not: category.id }, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate) return Response.json({ error: "A category with this name already exists." }, { status: 409 });

    const updated = await db.category.update({ where: { id: category.id }, data: { name } });
    invalidatePublicMenu(restaurantId);
    return Response.json({ category: updated });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const category = await db.category.findFirst({
      where: { id: params.id, restaurantId, deletedAt: null },
    });
    if (!category) return Response.json({ error: "Category not found" }, { status: 404 });

    const itemCount = await db.menuItem.count({
      where: { restaurantId, categoryId: category.id, deletedAt: null },
    });
    if (itemCount > 0) {
      return Response.json({ error: "This category still contains menu items. Rename it or move those items individually before deleting it." }, { status: 409 });
    }

    await db.category.update({
      where: { id: category.id },
      data: { deletedAt: new Date(), isActive: false },
    });
    invalidatePublicMenu(restaurantId);
    return Response.json({ success: true });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
