import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const DEFAULT_CATEGORIES = [
  "Main Course",
  "Starters & Appetizers",
  "Beverages & Drinks",
  "Desserts & Sweets",
  "Today's Specials",
];

export async function GET() {
  try {
    const { restaurantId } = await requireRestaurantUser();
    let categories = await db.category.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: { position: "asc" },
    });

    // If new restaurant has 0 categories, auto-seed standard categories for them!
    if (categories.length === 0) {
      await db.$transaction(
        DEFAULT_CATEGORIES.map((name, index) =>
          db.category.create({
            data: {
              restaurantId,
              name,
              position: index + 1,
              isActive: true,
            },
          })
        )
      );

      categories = await db.category.findMany({
        where: { restaurantId, deletedAt: null },
        orderBy: { position: "asc" },
      });
    }

    return Response.json({ categories });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

const BodySchema = z.object({ name: z.string().trim().min(1, "Category name is required").max(60) });

export async function POST(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const { name } = BodySchema.parse(await req.json());
    const count = await db.category.count({ where: { restaurantId } });
    const category = await db.category.create({
      data: { restaurantId, name, position: count + 1, isActive: true },
    });
    return Response.json({ category }, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
