import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { invalidatePublicMenu } from "@/lib/publicMenuCache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const items = await db.menuItem.findMany({
      where: { restaurantId, deletedAt: null },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ items });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

const BodySchema = z.object({
  name:        z.string().min(1).max(100),
  categoryId:  z.string().min(1),
  priceCents:  z.number().int().min(0),
  description: z.string().max(1000).nullable().optional(),
  isVeg:       z.boolean().default(true),
  isAvailable: z.boolean().default(true).optional(),
  imageUrl:    z.string().nullable().optional(),
  isBestseller: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  isChefsPick: z.boolean().optional(),
  isTodaySpecial: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const body = BodySchema.parse(await req.json());

    // Confirm the category actually belongs to THIS restaurant before
    // attaching an item to it — prevents cross-tenant category injection.
    const category = await db.category.findFirst({ where: { id: body.categoryId, restaurantId } });
    if (!category) return Response.json({ error: "Invalid category" }, { status: 400 });

    const item = await db.menuItem.create({ data: { ...body, restaurantId } });
    invalidatePublicMenu(restaurantId);
    return Response.json({ item }, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
