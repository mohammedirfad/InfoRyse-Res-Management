import { z } from "zod";
import { db } from "@/lib/db";
import { checkOrderRateLimit } from "@/lib/rateLimit";

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
    const restaurant = await db.restaurant.findUnique({ where: { slug: body.slug } });
    if (!restaurant || !restaurant.isActive) {
      return Response.json({ error: "Restaurant unavailable" }, { status: 404 });
    }

    const table = await db.table.findFirst({
      where: { qrToken: body.qrToken, restaurantId: restaurant.id, deletedAt: null },
    });
    if (!table) return Response.json({ error: "Invalid QR code" }, { status: 404 });

    // 2) Gate: restaurant must be open.
    if (!restaurant.openNow) {
      return Response.json({ error: "Restaurant is currently closed" }, { status: 409 });
    }

    // 3) Gate: table must be OCCUPIED — this is the main defense against a
    //    screenshot of the QR being used away from the table later.
    if (table.status !== "OCCUPIED") {
      return Response.json(
        { error: "Please ask our staff to seat you before ordering" },
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
    const existing = await db.order.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
    if (existing) {
      return Response.json({ order: existing, duplicate: true }, { status: 200 });
    }

    // 6) Re-price every item from the DATABASE — never trust a price the
    //    client sends. Reject anything unavailable, deleted, or from a
    //    different restaurant than the one resolved above.
    const menuItemIds = body.items.map((i) => i.menuItemId);
    const dbItems = await db.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId: restaurant.id, deletedAt: null },
    });
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

    // 7) Per-restaurant sequential order number (simple, readable to staff).
    const lastOrder = await db.order.findFirst({
      where: { restaurantId: restaurant.id },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const nextOrderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    // 8) Single transaction — order + its items are created together or not at all.
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          restaurantId: restaurant.id,
          tableId: table.id,
          orderNumber: nextOrderNumber,
          customerName:  body.customerName,
          customerPhone: body.customerPhone,
          customerEmail: (body as any).customerEmail,
          notes: body.notes,
          orderType: body.orderType ?? "DINE_IN",
          paymentMethod: body.paymentMethod ?? "PAY_AT_RESTAURANT",
          status: "NEW",
          subtotalCents,
          totalCents: subtotalCents, // extend here once taxes/charges are modeled
          idempotencyKey: body.idempotencyKey,
          items: {
            create: body.items.map((line) => {
              const dbItem = dbItemById.get(line.menuItemId)!;
              return {
                menuItemId: dbItem.id,
                nameSnapshot: dbItem.name,
                priceCentsSnapshot: dbItem.priceCents,
                quantity: line.quantity,
              };
            }),
          },
          statusHistory: { create: { status: "NEW" } },
        },
        include: { items: true },
      });
      return created;
    });

    return Response.json({ order }, { status: 201 });
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
