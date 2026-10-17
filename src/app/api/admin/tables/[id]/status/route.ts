import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

const BodySchema = z.object({ status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "OUT_OF_SERVICE"]) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const { status } = BodySchema.parse(await req.json());

    const table = await db.table.findFirst({ where: { id: params.id, restaurantId, deletedAt: null } });
    if (!table) return Response.json({ error: "Not found" }, { status: 404 });

    const updated = await db.$transaction(async (tx) => {
      const u = await tx.table.update({ where: { id: table.id }, data: { status } });
      if (status === "OCCUPIED") {
        const existingSession = await tx.tableSession.findFirst({
          where: { tableId: table.id, restaurantId, status: "OPEN" },
        });
        if (!existingSession) {
          await tx.tableSession.create({
            data: { tableId: table.id, restaurantId, status: "OPEN" },
          });
        }
      } else if (status === "AVAILABLE") {
        await tx.tableSession.updateMany({
          where: { tableId: table.id, restaurantId, status: "OPEN" },
          data:  { status: "FINALIZED", finalizedAt: new Date(), paidAt: new Date() },
        });
        await tx.order.updateMany({
          where: { tableId: table.id, restaurantId, status: { notIn: ["CANCELLED", "COMPLETED"] } },
          data: { status: "COMPLETED" },
        });
      }
      return u;
    });

    const { emitOrderEvent } = await import("@/lib/events");
    emitOrderEvent({
      restaurantId,
      type: "order_updated",
      data: { tableId: table.id, status },
    });

    return Response.json({ table: updated });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
