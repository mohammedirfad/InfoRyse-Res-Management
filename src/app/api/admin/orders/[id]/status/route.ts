import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { emitOrderEvent } from "@/lib/events";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const BodySchema = z.object({
  status: z.enum(["NEW", "ACCEPTED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const startedAt = performance.now();
  let authMs = 0;
  let databaseMs = 0;
  let broadcastMs = 0;
  try {
    const authStartedAt = performance.now();
    const { restaurantId, userId } = await requireRestaurantUser();
    authMs = performance.now() - authStartedAt;
    const { status: nextStatus } = BodySchema.parse(await req.json());

    // Scoped by restaurantId — staff at Restaurant A can never touch
    // Restaurant B's order even if they had the raw order id.
    const order = await db.order.findFirst({
      where: { id: params.id, restaurantId },
      select: { id: true, status: true, tableId: true, orderNumber: true },
    });
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      return Response.json(
        { error: `Cannot move order from ${order.status} to ${nextStatus}` },
        { status: 409 }
      );
    }

    const databaseStartedAt = performance.now();
    const didUpdate = await db.$transaction(async (tx) => {
      // Only final fulfillment changes can race with bill generation. Earlier
      // kitchen transitions do not affect the bill and should not queue behind
      // other actions on the same table.
      if (order.tableId && (nextStatus === "COMPLETED" || nextStatus === "CANCELLED")) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${order.tableId}))::text AS "locked"`;
      }
      const claimed = await tx.order.updateMany({
        where: { id: order.id, restaurantId, status: order.status },
        data: { status: nextStatus },
      });
      if (claimed.count !== 1) return false;
      if (nextStatus === "COMPLETED") {
        await tx.$executeRaw`UPDATE "OrderItem" SET "servedQuantity" = GREATEST(0, "quantity" - "cancelledQuantity") WHERE "orderId" = ${order.id}`;
      } else if (nextStatus === "CANCELLED") {
        await tx.$executeRaw`UPDATE "OrderItem" SET "servedQuantity" = 0, "cancelledQuantity" = "quantity" WHERE "orderId" = ${order.id}`;
      }
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: nextStatus, changedBy: userId } });
      return true;
    });
    databaseMs = performance.now() - databaseStartedAt;
    if (!didUpdate) return Response.json({ error: "Order status changed while processing. Refresh and try again." }, { status: 409 });

    const broadcastStartedAt = performance.now();
    await emitOrderEvent({
      restaurantId,
      type: "order_updated",
      data: { orderId: order.id, orderNumber: order.orderNumber, tableId: order.tableId, status: nextStatus },
    });
    broadcastMs = performance.now() - broadcastStartedAt;

    const totalMs = performance.now() - startedAt;
    const serverTiming = `auth;dur=${authMs.toFixed(1)}, database;dur=${databaseMs.toFixed(1)}, broadcast;dur=${broadcastMs.toFixed(1)}, total;dur=${totalMs.toFixed(1)}`;
    console.info("[order:status:timing]", serverTiming);
    return Response.json({ order: { id: order.id, status: nextStatus } }, { headers: { "Server-Timing": serverTiming } });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
