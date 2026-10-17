import { z } from "zod";
import { db } from "@/lib/db";
import { emitOrderEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  slug:     z.string(),
  qrToken:  z.string(),
});

/**
 * Customer-facing cancel endpoint.
 * Only allows cancellation from NEW or ACCEPTED — once kitchen starts
 * PREPARING, the customer can no longer cancel.
 */
export async function POST(
  req: Request,
  { params }: { params: { orderNumber: string } }
) {
  try {
    const body        = BodySchema.parse(await req.json());
    const orderNumber = parseInt(params.orderNumber, 10);
    if (isNaN(orderNumber)) return Response.json({ error: "Invalid order number" }, { status: 400 });

    const restaurant = await db.restaurant.findUnique({
      where: { slug: body.slug },
      select: { id: true },
    });
    if (!restaurant) return Response.json({ error: "Not found" }, { status: 404 });

    // Verify the QR token belongs to the same restaurant (security check)
    const table = await db.table.findFirst({
      where: { qrToken: body.qrToken, restaurantId: restaurant.id },
      select: { id: true },
    });
    if (!table) return Response.json({ error: "Invalid QR code" }, { status: 403 });

    const order = await db.order.findFirst({
      where: { restaurantId: restaurant.id, orderNumber, tableId: table.id },
      select: { id: true, status: true },
    });

    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

    if (!["NEW", "ACCEPTED"].includes(order.status)) {
      return Response.json(
        { error: "Order can no longer be cancelled — kitchen has already started preparing it." },
        { status: 409 }
      );
    }

    await db.$transaction([
      db.order.update({
        where: { id: order.id },
        data:  { status: "CANCELLED" },
      }),
      db.orderStatusHistory.create({
        data: { orderId: order.id, status: "CANCELLED" },
      }),
    ]);

    emitOrderEvent({
      restaurantId: restaurant.id,
      type: "order_updated",
      data: { orderId: order.id, orderNumber, status: "CANCELLED" },
    });

    return Response.json({ ok: true, message: "Order cancelled successfully." });
  } catch (err) {
    console.error("[order:cancel]", err);
    return Response.json({ error: "Could not cancel order" }, { status: 500 });
  }
}
