import { z } from "zod";
import { db } from "@/lib/db";
import { requireFastRestaurantUser, requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { invalidatePublicMenu } from "@/lib/publicMenuCache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireFastRestaurantUser();
    const url = new URL(request.url);
    const pageParam = url.searchParams.get("page");
    const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "30", 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 30));
    const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
    const search = url.searchParams.get("search")?.trim() ?? "";
    const categoryId = url.searchParams.get("categoryId");
    const paginated = pageParam !== null || url.searchParams.has("limit") || Boolean(search) || Boolean(categoryId);
    const where: any = { restaurantId, deletedAt: null };
    if (categoryId) where.categoryId = categoryId;
    if (search) where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { name: { contains: search, mode: "insensitive" } } },
    ];
    if (paginated) {
      const [items, total] = await Promise.all([
        db.menuItem.findMany({ where, include: { category: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit }),
        db.menuItem.count({ where }),
      ]);
      return Response.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total } });
    }
    const items = await db.menuItem.findMany({
      where,
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
