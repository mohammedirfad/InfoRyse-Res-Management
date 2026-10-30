import { z } from "zod";
import { db } from "@/lib/db";
import { checkOrderRateLimit } from "@/lib/rateLimit";
import { emitOrderEvent } from "@/lib/events";
import { reserveOrderNumber } from "@/lib/orderNumber";
import { getOrCreateCurrentTableSession } from "@/lib/tableSessions";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  slug:            z.string(),
  qrToken:         z.string(),
  idempotencyKey:  z.string().uuid(),
  customerName:    z.string().max(100).optional(),
  customerPhone:   z.string().max(20).optional(),
  customerEmail:   z.string().email().optional(),
  notes:           z.string().max(500).optional(),
  orderType:       z.enum(["DINE_IN", "TAKEAWAY"]).optional(),
  paymentMethod:   z.enum(["PAY_AT_RESTAURANT", "UPI", "CARD", "WALLET"]).optional(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity:   z.number().int().min(1).max(20),
  })).min(1).max(50),
});

/**
 * Security layers (all must pass):
 * 1. Table must be OCCUPIED
 * 2. Restaurant must be open
 * 3. Per-table + per-IP rate limit (max 3 orders per 10 min per table)
 * 4. Idempotency key deduplication
 * 5. Server-side price re-validation (never trust client prices)
 * 6. Transaction wrapping
 */
export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    // ── IP-based rate limit ──────────────────────────────────────────────────
    // Blocks bulk automated requests from the same IP regardless of table
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            ?? req.headers.get("x-real-ip")
            ?? "unknown";
    const ipLimit = checkOrderRateLimit("ip:" + ip, "global");
    if (!ipLimit.allowed) {
      return Response.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    // 1) Resolve restaurant + table from the QR token — never trust a
    //    restaurantId/tableId sent directly by the client.
    const table = await db.table.findFirst({
      where: { qrToken: body.qrToken, deletedAt: null, restaurant: { slug: body.slug } },
      select: {
        id: true,
        label: true,
        status: true,
        restaurant: {
          select: {
            id: true,
            isActive: true,
            openNow: true,
            discountActive: true,
            discountPercent: true,
          },
        },
      },
    });
    if (!table) return Response.json({ error: "Invalid QR code" }, { status: 404 });
    const restaurant = table.restaurant;
    if (!restaurant.isActive) {
      return Response.json({ error: "Restaurant unavailable" }, { status: 404 });
    }

    // 2) Gate: restaurant must be open.
    if (!restaurant.openNow) {
      return Response.json({ error: "Restaurant is currently closed" }, { status: 409 });
    }

    // 3) Gate: table must be ready for ordering (AVAILABLE or OCCUPIED).
    // Reserved or Out of Service tables cannot place orders.
    if (table.status !== "OCCUPIED" && table.status !== "AVAILABLE") {
      return Response.json(
        { error: "This table is currently unavailable or reserved. Please ask our staff to assist you." },
        { status: 409 }
      );
    }

    // 4) Rate limit per table, independent of every other table/restaurant.
    const limit = checkOrderRateLimit(restaurant.id, table.id);
    if (!limit.allowed) {
      return Response.json({ error: "Please wait a moment before ordering again" }, { status: 429 });
    }

    // 5) Idempotency — if this exact submission already landed, return the
    //    existing order instead of creating a duplicate (covers double-taps
    //    and network retries).
    const [existing, dbItems] = await Promise.all([
      db.order.findUnique({ where: { idempotencyKey: body.idempotencyKey } }),
      db.menuItem.findMany({
        where: { id: { in: body.items.map((item) => item.menuItemId) }, restaurantId: restaurant.id, deletedAt: null },
      }),
    ]);
    if (existing) {
      return Response.json({ order: existing, duplicate: true }, { status: 200 });
    }

    // 6) Re-price every item from the DATABASE — never trust a price the
    //    client sends. Reject anything unavailable, deleted, or from a
    //    different restaurant than the one resolved above.
    const dbItemById = new Map(dbItems.map((i) => [i.id, i]));

    for (const line of body.items) {
      const dbItem = dbItemById.get(line.menuItemId);
      if (!dbItem || !dbItem.isAvailable) {
        return Response.json(
          { error: `An item in your cart is no longer available. Please refresh the menu.` },
          { status: 409 }
        );
      }
    }

    const subtotalCents = body.items.reduce((sum, line) => {
      const dbItem = dbItemById.get(line.menuItemId)!;
      return sum + dbItem.priceCents * line.quantity;
    }, 0);

    // 7) Reserve a tenant-local order number atomically across Vercel instances.
    const orderNumber = await reserveOrderNumber(restaurant.id);
    let session: { order: any; tableSessionId: string };
    try {
      session = await db.$transaction(async (tx: any) => {
          // Only serialize first-session creation for this table. Other tables
          // keep accepting orders concurrently.
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${table.id}))::text AS "locked"`;
          // Find an open session for this table
          const tableSession = await getOrCreateCurrentTableSession(tx, table.id, restaurant.id);

          // No open session → create one

          const created = await tx.order.create({
            data: {
              restaurantId:   restaurant.id,
              tableId:        table.id,
              tableSessionId: tableSession.id,
              orderNumber,
              customerName:   body.customerName,
              customerPhone:  body.customerPhone,
              customerEmail:  (body as any).customerEmail,
              notes:          body.notes,
              orderType:      body.orderType ?? "DINE_IN",
              paymentMethod:  body.paymentMethod ?? "PAY_AT_RESTAURANT",
              status:         "NEW",
              subtotalCents,
              totalCents: restaurant.discountActive && (restaurant.discountPercent ?? 0) > 0
                ? Math.max(0, subtotalCents - Math.round(subtotalCents * ((restaurant.discountPercent ?? 0) / 100)))
                : subtotalCents,
              idempotencyKey: body.idempotencyKey,
              items: {
                create: body.items.map((line) => {
                  const dbItem = dbItemById.get(line.menuItemId)!;
                  return {
                    menuItemId:         dbItem.id,
                    nameSnapshot:       dbItem.name,
                    priceCentsSnapshot: dbItem.priceCents,
                    quantity:           line.quantity,
                  };
                }),
              },
              statusHistory: { create: { status: "NEW" } },
            },
            include: { items: true },
          });

          if (table.status !== "OCCUPIED") {
            await tx.table.update({
              where: { id: table.id },
              data:  { status: "OCCUPIED" },
            });
          }

          return { order: created, tableSessionId: tableSession.id };
      });
    } catch (err: any) {
      // Concurrent retries with the same idempotency key can race past the
      // initial lookup. Return the already-created order instead of a 500.
      if (err?.code === "P2002") {
        const duplicate = await db.order.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
        if (duplicate) return Response.json({ order: duplicate, duplicate: true }, { status: 200 });
      }
      throw err;
    }

    await emitOrderEvent({
      restaurantId: restaurant.id,
      type: "order_created",
      data: {
        orderId: session.order.id,
        orderNumber: session.order.orderNumber,
        customerName: session.order.customerName,
        createdAt: session.order.createdAt,
        tableLabel: table.label,
        tableId: table.id,
        totalCents: session.order.totalCents,
      },
    });

    return Response.json({ order: session.order, tableSessionId: session.tableSessionId }, { status: 201 });
  } catch (err) {
    console.error("[order:create]", err);
    const msg = String(err);
    if (msg.includes("Can't reach database") || msg.includes("ECONNREFUSED")) {
      return Response.json(
        { error: "Service temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }
    return Response.json({ error: "Could not place order, please try again" }, { status: 500 });
  }
}
