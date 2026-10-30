import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { emitOrderEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const Body = z.object({
  servedQuantity: z.number().int().min(0),
  cancelledQuantity: z.number().int().min(0),
});

export async function PATCH(req: Request, { params }: { params: { id: string; itemId: string } }) {
  try {
    const { restaurantId, userId } = await requireRestaurantUser();
    const body = Body.parse(await req.json());
    const scopedOrder = await db.order.findFirst({
      where: { id: params.id, restaurantId },
      select: { tableId: true },
    });
    if (!scopedOrder) return Response.json({ error: "Order not found." }, { status: 404 });
    const result = await db.$transaction(async (tx) => {
      if (scopedOrder.tableId) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${scopedOrder.tableId}))::text AS "locked"`;
      }
      const order = await tx.order.findFirst({
        where: { id: params.id, restaurantId, status: "READY" },
        include: { tableSession: { select: { status: true } } },
      });
      if (!order || order.tableSession?.status === "FINALIZED") return { error: "Only items on a ready, unpaid order can be updated." } as const;
      const item = await tx.orderItem.findFirst({ where: { id: params.itemId, orderId: order.id } });
      if (!item) return { error: "Order item not found." } as const;
      if (body.servedQuantity + body.cancelledQuantity > item.quantity) {
        return { error: "Served and cancelled quantities cannot exceed the ordered quantity." } as const;
      }
      await tx.orderItem.update({ where: { id: item.id }, data: body });
      const remaining = await tx.orderItem.findMany({ where: { orderId: order.id }, select: { quantity: true, servedQuantity: true, cancelledQuantity: true } });
      const complete = remaining.every((line) => line.servedQuantity + line.cancelledQuantity >= line.quantity);
      if (complete) {
        await tx.order.update({ where: { id: order.id }, data: { status: "COMPLETED" } });
        await tx.orderStatusHistory.create({ data: { orderId: order.id, status: "COMPLETED", changedBy: userId } });
      }
      return { orderId: order.id, tableId: order.tableId, completed: complete } as const;
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: 409 });
    await emitOrderEvent({ restaurantId, type: "order_updated", data: { orderId: result.orderId, tableId: result.tableId, status: result.completed ? "COMPLETED" : "READY" } });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Invalid item fulfillment" }, { status: 400 });
    return tenantErrorResponse(error);
  }
}
