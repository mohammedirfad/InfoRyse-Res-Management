import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { invalidatePublicMenu } from "@/lib/publicMenuCache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const categories = await db.category.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: { position: "asc" },
    });
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
    const existing = await db.category.findFirst({
      where: { restaurantId, deletedAt: null, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) return Response.json({ category: existing, duplicate: true }, { status: 200 });
    const count = await db.category.count({ where: { restaurantId, deletedAt: null } });
    try {
      const category = await db.category.create({
        data: { restaurantId, name, position: count + 1, isActive: true },
      });
      invalidatePublicMenu(restaurantId);
      return Response.json({ category }, { status: 201 });
    } catch (err: any) {
      if (err?.code === "P2002") {
        const duplicate = await db.category.findFirst({
          where: { restaurantId, deletedAt: null, name: { equals: name, mode: "insensitive" } },
        });
        if (duplicate) return Response.json({ category: duplicate, duplicate: true }, { status: 200 });
      }
      throw err;
    }
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
