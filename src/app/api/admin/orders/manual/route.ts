import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { emitOrderEvent } from "@/lib/events";
import { reserveOrderNumber } from "@/lib/orderNumber";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  tableId:       z.string().uuid().optional(),
  customerName:  z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
  notes:         z.string().max(500).optional(),
  orderType:     z.enum(["DINE_IN","TAKEAWAY"]).default("DINE_IN"),
  paymentMethod: z.enum(["PAY_AT_RESTAURANT","UPI","CARD","WALLET"]).default("PAY_AT_RESTAURANT"),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity:   z.number().int().min(1).max(50),
  })).min(1),
});

/**
 * Staff / Owner — create a manual order from the admin panel.
 * Bypasses the table-occupied gate since staff are physically present.
 */
export async function POST(req: Request) {
  try {
    const { restaurantId, userId } = await requireRestaurantUser();
    const body = BodySchema.parse(await req.json());

    // Validate table belongs to this restaurant if provided
    if (body.tableId) {
      const table = await db.table.findFirst({ where: { id: body.tableId, restaurantId } });
      if (!table) return Response.json({ error: "Table not found" }, { status: 404 });
    }

    // Re-price from DB (same as customer flow — never trust client prices)
    const menuItems = await db.menuItem.findMany({
      where: { id: { in: body.items.map(i=>i.menuItemId) }, restaurantId, deletedAt: null },
    });
    const byId = new Map(menuItems.map(i=>[i.id,i]));

    for (const line of body.items) {
      if (!byId.get(line.menuItemId)) {
        return Response.json({ error: `Item not found in this restaurant's menu` }, { status: 409 });
      }
    }

    const subtotal = body.items.reduce((s,l)=>{
      const item = byId.get(l.menuItemId)!;
      return s + item.priceCents * l.quantity;
    }, 0);

    const orderNumber = await reserveOrderNumber(restaurantId);
    const order = await db.$transaction(async tx => {
      let tableSessionId: string | null = null;
      if (body.tableId) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${body.tableId}))::text AS "locked"`;
        let session = await tx.tableSession.findFirst({
          where: { tableId: body.tableId, restaurantId, status: "OPEN" },
        });
        if (!session) {
          session = await tx.tableSession.create({
            data: { tableId: body.tableId, restaurantId, status: "OPEN" },
          });
        }
        tableSessionId = session.id;
        // ensure table is marked OCCUPIED
        await tx.table.update({ where: { id: body.tableId }, data: { status: "OCCUPIED" } });
      }

      return tx.order.create({
        data: {
          restaurantId,
          tableId:       body.tableId,
          tableSessionId,
          orderNumber,
          customerName:  body.customerName,
          customerPhone: body.customerPhone,
          notes:         body.notes,
          orderType:     body.orderType,
          paymentMethod: body.paymentMethod,
          status:        "ACCEPTED", // staff-created orders auto-accept
          subtotalCents: subtotal,
          totalCents:    subtotal,
          idempotencyKey:`manual_${userId}_${Date.now()}`,
          createdByStaff: userId,
          items: {
            create: body.items.map(l=>{
              const item = byId.get(l.menuItemId)!;
              return {
                menuItemId:         item.id,
                nameSnapshot:       item.name,
                priceCentsSnapshot: item.priceCents,
                quantity:           l.quantity,
              };
            }),
          },
          statusHistory: {
            create: [
              { status: "NEW",      createdAt: new Date(Date.now()-1000), changedBy: userId },
              { status: "ACCEPTED", changedBy: userId },
            ],
          },
        },
        include: { items: true, table: true },
      });
    });

    emitOrderEvent({
      restaurantId,
      type: "order_created",
      data: order,
    });

    return Response.json({ order }, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
