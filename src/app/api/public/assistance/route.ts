import { z } from "zod";
import { db } from "@/lib/db";
import { emitOrderEvent } from "@/lib/events";
import { reserveOrderNumber } from "@/lib/orderNumber";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  slug:        z.string(),
  qrToken:     z.string(),
  tableLabel:  z.string(),
  requests:    z.array(z.string()).min(1),
  custom:      z.string().max(500).optional(),
});

/**
 * Customer-facing endpoint — no auth required.
 * Records an assistance request so the admin/staff Orders page can surface it.
 * We store it as a special order note tagged "ASSISTANCE" so the
 * existing polling loop in the admin orders page picks it up automatically.
 */
export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const restaurant = await db.restaurant.findUnique({ where: { slug: body.slug } });
    if (!restaurant || !restaurant.isActive) {
      return Response.json({ ok: false }, { status: 404 });
    }

    const table = await db.table.findFirst({
      where: { qrToken: body.qrToken, restaurantId: restaurant.id, deletedAt: null },
    });
    if (!table) return Response.json({ ok: false }, { status: 404 });

    // Build a readable summary of what the customer needs
    const requestSummary = [
      ...body.requests,
      ...(body.custom ? [`Custom: ${body.custom}`] : []),
    ].join(", ");

    const orderNumber = await reserveOrderNumber(restaurant.id);
    await db.$transaction(async (tx) => {
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          await tx.order.create({
            data: {
              restaurantId:   restaurant.id,
              tableId:        table.id,
              orderNumber,
              customerName:   `Table ${table.label}`,
              status:         "NEW",
              subtotalCents:  0,
              totalCents:     0,
              idempotencyKey: `assist_${table.id}_${Date.now()}_${randomSuffix}`,
              notes:          `🔔 ASSISTANCE REQUEST: ${requestSummary}`,
              orderType:      "DINE_IN",
              paymentMethod:  "PAY_AT_RESTAURANT",
              items:          { create: [] },
              statusHistory:  { create: { status: "NEW" } },
            },
          });
    });

    emitOrderEvent({
      restaurantId: restaurant.id,
      type: "order_created",
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[assistance]", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
