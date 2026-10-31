import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { getCurrentTableSession } from "@/lib/tableSessions";
import { getPublicAppUrl } from "@/lib/appUrl";
import { emitOrderEvent } from "@/lib/events";
import { calculateTaxBreakdown, getTaxRates, taxSummary } from "@/lib/taxes";

export const dynamic = "force-dynamic";

const Body = z.object({
  tableSessionId: z.string().uuid(),
  customerName: z.string().trim().max(100).optional(),
  customerPhone: z.string().trim().max(20).optional(),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
});

export async function POST(req: Request, { params }: { params: { tableId: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const body = Body.parse(await req.json());
    const phone = body.customerPhone?.trim() || "";
    const email = body.customerEmail?.trim().toLowerCase() || "";

    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${params.tableId}))::text AS "locked"`;
      const current = await getCurrentTableSession(tx, params.tableId, restaurantId);
      if (!current || current.id !== body.tableSessionId) return { error: "This table session has expired." } as const;

      const [session, table, restaurant] = await Promise.all([
        tx.tableSession.findFirst({
          where: { id: current.id, restaurantId, status: "OPEN" },
          include: { orders: { where: { status: { not: "CANCELLED" } }, include: { items: true }, orderBy: { createdAt: "asc" } } },
        }),
        tx.table.findFirst({ where: { id: params.tableId, restaurantId }, select: { id: true, label: true } }),
        tx.restaurant.findUnique({ where: { id: restaurantId }, select: { taxName: true, taxPercent: true, additionalTaxes: true, discountActive: true, discountPercent: true, discountName: true } }),
      ]);
      if (!session || !table || !restaurant || !session.orders.length) return { error: "There are no served items ready to bill." } as const;

      const resolvedPhone = phone || session.orders.find((order) => order.customerPhone)?.customerPhone || "";
      const resolvedEmail = email || session.orders.find((order) => order.customerEmail)?.customerEmail || "";
      const aggregated = new Map<string, { name: string; unitPrice: number; quantity: number; subtotal: number }>();
      for (const order of session.orders) for (const item of order.items) {
        const servedQuantity = Math.max(0, Math.min(item.quantity, item.servedQuantity));
        if (servedQuantity === 0) continue;
        const key = `${item.nameSnapshot}:${item.priceCentsSnapshot}`;
        const line = aggregated.get(key) ?? { name: item.nameSnapshot, unitPrice: item.priceCentsSnapshot, quantity: 0, subtotal: 0 };
        line.quantity += servedQuantity;
        line.subtotal += item.priceCentsSnapshot * servedQuantity;
        aggregated.set(key, line);
      }
      const items = [...aggregated.values()];
      if (!items.length) return { error: "No served items are billable yet. Mark served items in the Orders panel first." } as const;
      const subtotalCents = items.reduce((sum, item) => sum + item.subtotal, 0);
      const discountPercent = restaurant.discountActive ? restaurant.discountPercent ?? 0 : 0;
      const discountCents = Math.round(subtotalCents * discountPercent / 100);
      const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
      const taxBreakdown = calculateTaxBreakdown(discountedSubtotal, getTaxRates(restaurant.taxName, restaurant.taxPercent, restaurant.additionalTaxes));
      const { taxPercent, taxName, taxCents } = taxSummary(taxBreakdown);
      const packingCents = subtotalCents > 0 ? 2000 : 0;
      const totalCents = discountedSubtotal + taxCents + packingCents;
      const billData = {
        tableId: table.id,
        tableLabel: table.label,
        tableSessionId: session.id,
        customerName: body.customerName || session.orders.find((order) => order.customerName)?.customerName || null,
        customerPhone: resolvedPhone || null,
        customerEmail: resolvedEmail || null,
        orderCount: session.orders.length,
        subtotalCents,
        discountCents,
        discountPercent,
        discountName: discountPercent ? restaurant.discountName || "Special Offer" : null,
        taxCents,
        taxPercent,
        taxName,
        taxBreakdown,
        packingCents,
        totalCents,
        paymentMethod: "UNPAID",
        paymentStatus: "PENDING",
        paidAt: null,
        itemsJson: JSON.stringify(items),
      };
      const existing = await tx.bill.findFirst({ where: { restaurantId, tableSessionId: session.id }, orderBy: { createdAt: "desc" } });
      if (existing?.paymentStatus === "PAID") return { error: "This table session is already paid." } as const;
      let bill;
      if (existing) {
        bill = await tx.bill.update({ where: { id: existing.id }, data: {
          shareToken: existing.shareToken || randomBytes(32).toString("base64url"),
          ...billData,
        } });
      } else {
        await tx.$queryRaw`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`;
        const lastBill = await tx.bill.findFirst({ where: { restaurantId }, orderBy: { billNumber: "desc" }, select: { billNumber: true } });
        bill = await tx.bill.create({ data: {
          restaurantId,
          billNumber: (lastBill?.billNumber ?? 1000) + 1,
          shareToken: randomBytes(32).toString("base64url"),
          ...billData,
        } });
      }
      await tx.tableSession.update({ where: { id: session.id }, data: { billRequestedAt: null } });
      const resolved = await tx.serviceRequest.updateMany({
        where: { restaurantId, tableSessionId: session.id, requests: { has: "pay_bill" }, status: { in: ["PENDING", "IN_PROGRESS"] } },
        data: { status: "COMPLETED" },
      });
      return { bill, tableId: table.id, resolvedBillRequest: resolved.count > 0 } as const;
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: 409 });

    void emitOrderEvent({ restaurantId, type: "bill_updated", data: { billId: result.bill.id, tableId: result.tableId, tableSessionId: result.bill.tableSessionId, shareToken: result.bill.shareToken } });
    if (result.resolvedBillRequest) {
      const request = await db.serviceRequest.findFirst({ where: { restaurantId, tableSessionId: result.bill.tableSessionId, requests: { has: "pay_bill" }, status: "COMPLETED" }, orderBy: { updatedAt: "desc" }, select: { id: true, tableId: true, tableSessionId: true, tableLabel: true, requests: true, custom: true, status: true, createdAt: true } });
      if (request) void emitOrderEvent({ restaurantId, type: "service_request_updated", data: { request } });
    }

    const bill = await db.bill.findUniqueOrThrow({ where: { id: result.bill.id } });
    return Response.json({ bill, billUrl: `${getPublicAppUrl(req.url)}/bill/${bill.shareToken}` }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message || "Invalid bill details" }, { status: 400 });
    return tenantErrorResponse(error);
  }
}
