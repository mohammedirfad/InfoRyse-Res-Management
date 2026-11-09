import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { emitOrderEvent } from "@/lib/events";

const Schema = z.object({
  customerName: z.string().max(100).nullable().optional(),
  customerPhone: z.string().max(20).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  items: z.array(z.object({ menuItemId: z.string().uuid(), quantity: z.number().int().min(1).max(50) })).min(1).max(50),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const body = Schema.parse(await req.json());
    const current = await db.order.findFirst({ where: { id: params.id, restaurantId }, include: { tableSession: true, items: true } });
    if (!current) return Response.json({ error: "Order not found" }, { status: 404 });
    if (["COMPLETED", "CANCELLED"].includes(current.status) || current.tableSession?.status === "FINALIZED") return Response.json({ error: "A completed, cancelled, or billed order cannot be edited." }, { status: 409 });
    if (current.items.some((item) => item.servedQuantity > 0 || item.cancelledQuantity > 0)) return Response.json({ error: "This order has fulfillment activity. Finish the current items before editing it." }, { status: 409 });
    const menuItems = await db.menuItem.findMany({ where: { id: { in: body.items.map((i) => i.menuItemId) }, restaurantId, deletedAt: null } });
    const byId = new Map(menuItems.map((i) => [i.id, i]));
    if (body.items.some((i) => !byId.has(i.menuItemId))) return Response.json({ error: "A selected menu item is no longer available." }, { status: 409 });
    const subtotalCents = body.items.reduce((sum, line) => sum + byId.get(line.menuItemId)!.priceCents * line.quantity, 0);
    const updated = await db.$transaction(async (tx) => {
      const existingByMenuId = new Map(current.items.filter((item) => item.menuItemId).map((item) => [item.menuItemId!, item]));
      const requestedIds = new Set(body.items.map((line) => line.menuItemId));
      const removed = current.items.filter((item) => !item.menuItemId || !requestedIds.has(item.menuItemId));
      if (removed.length) await tx.orderItem.deleteMany({ where: { id: { in: removed.map((item) => item.id) }, orderId: current.id } });
      for (const line of body.items) {
        const menuItem = byId.get(line.menuItemId)!;
        const existing = existingByMenuId.get(line.menuItemId);
        if (existing) await tx.orderItem.update({ where: { id: existing.id }, data: { quantity: line.quantity, nameSnapshot: menuItem.name, priceCentsSnapshot: menuItem.priceCents } });
        else await tx.orderItem.create({ data: { orderId: current.id, menuItemId: menuItem.id, nameSnapshot: menuItem.name, priceCentsSnapshot: menuItem.priceCents, quantity: line.quantity } });
      }
      return tx.order.update({ where: { id: current.id }, data: {
        customerName: body.customerName?.trim() || null,
        customerPhone: body.customerPhone?.trim() || null,
        notes: body.notes?.trim() || null,
        subtotalCents, totalCents: subtotalCents,
      }, include: { items: true, table: { select: { label: true } } } });
    });
    await emitOrderEvent({ restaurantId, type: "order_updated", data: { orderId: updated.id, orderNumber: updated.orderNumber, tableId: updated.tableId, status: updated.status, totalCents: updated.totalCents, items: updated.items } });
    return Response.json({ order: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Invalid order details" }, { status: 400 });
    return tenantErrorResponse(error);
  }
}
