import { z } from "zod";
import { db } from "@/lib/db";
import { emitOrderEvent } from "@/lib/events";
import { reserveOrderNumber } from "@/lib/orderNumber";
import { getCurrentTableSession } from "@/lib/tableSessions";

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
 * Bill requests are attached to the table session and shown in billing.
 * Other assistance requests remain visible to staff as assistance orders.
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

    const requests = body.requests.filter((request) => request !== "pay_bill");
    if (body.requests.includes("pay_bill")) {
      const session = await getCurrentTableSession(db, table.id, restaurant.id);
      if (session && !session.billRequestedAt) {
        await db.tableSession.update({
          where: { id: session.id },
          data: { billRequestedAt: new Date() },
        });
        emitOrderEvent({
          restaurantId: restaurant.id,
          type: "bill_updated",
          data: { tableId: table.id, sessionId: session.id, requested: true },
        });
      }
    }

    if (requests.length === 0) return Response.json({ ok: true });

    // Build a readable summary of what the customer needs
    const requestSummary = [
      ...requests,
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
