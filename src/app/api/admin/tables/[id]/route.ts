import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  label: z.string().trim().min(1).max(40).optional(),
  section: z.string().trim().max(60).optional().nullable(),
  capacity: z.number().int().min(1).max(50).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const body = UpdateSchema.parse(await req.json());
    const table = await db.table.findFirst({ where: { id: params.id, restaurantId, deletedAt: null } });
    if (!table) return Response.json({ error: "Table not found" }, { status: 404 });
    if (body.label && body.label !== table.label) {
      const duplicate = await db.table.findFirst({
        where: { restaurantId, label: { equals: body.label, mode: "insensitive" }, deletedAt: null, id: { not: table.id } },
      });
      if (duplicate) return Response.json({ error: "A table with this name already exists." }, { status: 409 });
    }
    const updated = await db.table.update({ where: { id: table.id }, data: body });
    return Response.json({ table: updated });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const table = await db.table.findFirst({ where: { id: params.id, restaurantId, deletedAt: null } });
    if (!table) return Response.json({ error: "Table not found" }, { status: 404 });
    const openSession = await db.tableSession.findFirst({
      where: { tableId: table.id, restaurantId, status: "OPEN" },
      select: { id: true },
    });
    if (openSession) return Response.json({ error: "Close the active table session before deleting this table." }, { status: 409 });
    await db.table.update({ where: { id: table.id }, data: { deletedAt: new Date(), status: "OUT_OF_SERVICE" } });
    return Response.json({ success: true });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
