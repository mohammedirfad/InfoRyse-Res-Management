import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { emitOrderEvent } from "@/lib/events";
import type { Prisma } from "@prisma/client";

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
  try {
    const { restaurantId, userId } = await requireRestaurantUser();
    const { status: nextStatus } = BodySchema.parse(await req.json());

    // Scoped by restaurantId — staff at Restaurant A can never touch
    // Restaurant B's order even if they had the raw order id.
    const order = await db.order.findFirst({ where: { id: params.id, restaurantId } });
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      return Response.json(
        { error: `Cannot move order from ${order.status} to ${nextStatus}` },
        { status: 409 }
      );
    }

    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { status: nextStatus } }),
      db.orderStatusHistory.create({
        data: { orderId: order.id, status: nextStatus, changedBy: userId },
      }),
    ]);
    const updated = await db.order.findUnique({ where: { id: order.id } });

    emitOrderEvent({
      restaurantId,
      type: "order_updated",
      data: { orderId: order.id, orderNumber: order.orderNumber, status: nextStatus },
    });

    return Response.json({ order: updated });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
