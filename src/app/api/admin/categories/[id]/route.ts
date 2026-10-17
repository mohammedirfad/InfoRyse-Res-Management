import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { invalidatePublicMenu } from "@/lib/publicMenuCache";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ replacementCategoryId: z.string().optional() });

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const category = await db.category.findFirst({
      where: { id: params.id, restaurantId, deletedAt: null },
    });
    if (!category) return Response.json({ error: "Category not found" }, { status: 404 });

    const itemCount = await db.menuItem.count({
      where: { restaurantId, categoryId: category.id, deletedAt: null },
    });
    if (itemCount && !body.replacementCategoryId) {
      return Response.json({ error: "Move this category's menu items to another category before deleting it." }, { status: 409 });
    }

    if (body.replacementCategoryId) {
      const replacement = await db.category.findFirst({
        where: { id: body.replacementCategoryId, restaurantId, deletedAt: null },
      });
      if (!replacement || replacement.id === category.id) {
        return Response.json({ error: "Choose another active category" }, { status: 400 });
      }
    }

    await db.$transaction(async (tx) => {
      if (body.replacementCategoryId) {
        await tx.menuItem.updateMany({
          where: { restaurantId, categoryId: category.id, deletedAt: null },
          data: { categoryId: body.replacementCategoryId },
        });
      }
      await tx.category.update({ where: { id: category.id }, data: { deletedAt: new Date(), isActive: false } });
    });
    invalidatePublicMenu(restaurantId);
    return Response.json({ success: true });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
