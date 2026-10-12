import { z } from "zod";
import { db } from "@/lib/db";

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

    // Record as a zero-item "assistance" order so admin/staff can see it
    // in the live orders board without needing a separate WebSocket channel.
    await db.order.create({
      data: {
        restaurantId:   restaurant.id,
        tableId:        table.id,
        orderNumber:    await nextOrderNumber(restaurant.id),
        customerName:   `Table ${table.label}`,
        status:         "NEW",
        subtotalCents:  0,
        totalCents:     0,
        idempotencyKey: `assist_${table.id}_${Date.now()}`,
        notes:          `🔔 ASSISTANCE REQUEST: ${requestSummary}`,
        orderType:      "DINE_IN",
        paymentMethod:  "PAY_AT_RESTAURANT",
        items: { create: [] },
        statusHistory: { create: { status: "NEW" } },
      },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[assistance]", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}

async function nextOrderNumber(restaurantId: string) {
  const last = await db.order.findFirst({
    where: { restaurantId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  return (last?.orderNumber ?? 0) + 1;
}
