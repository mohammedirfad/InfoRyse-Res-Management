import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

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

const BodySchema = z.object({ name: z.string().min(1).max(60) });

export async function POST(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const { name } = BodySchema.parse(await req.json());
    const count = await db.category.count({ where: { restaurantId } });
    const category = await db.category.create({
      data: { restaurantId, name, position: count + 1 },
    });
    return Response.json({ category }, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
