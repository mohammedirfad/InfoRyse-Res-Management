import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

const BodySchema = z.object({ status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "OUT_OF_SERVICE"]) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const { status } = BodySchema.parse(await req.json());

    const table = await db.table.findFirst({ where: { id: params.id, restaurantId } });
    if (!table) return Response.json({ error: "Not found" }, { status: 404 });

    const updated = await db.table.update({ where: { id: table.id }, data: { status } });
    return Response.json({ table: updated });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
