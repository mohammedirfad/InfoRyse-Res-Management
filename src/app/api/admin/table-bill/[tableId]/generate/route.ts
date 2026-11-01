import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { getCurrentTableSession } from "@/lib/tableSessions";
import { emitOrderEvent } from "@/lib/events";
import { getPublicAppUrl } from "@/lib/appUrl";
import { calculateTaxBreakdown, getTaxRates, taxSummary } from "@/lib/taxes";

export const dynamic = "force-dynamic";

const PACKING_CENTS = 2000;

const Body = z.object({
  tableSessionId: z.string().uuid().optional(),
});

/**
 * POST /api/admin/table-bill/[tableId]/generate
 *
 * The cashier's one-tap "Generate bill" for a guest bill request.
 *
 * It produces the final customer bill (pending payment) from the table's open
 * tab and pushes it to the guest over the realtime channel — the guest never
 * refreshes anything. The table stays OPEN until payment is recorded, so the
 * guest can keep ordering and a new bill can be regenerated.
 */
export async function POST(
  req: Request,
  { params }: { params: { tableId: string } },
) {
  const body = Body.parse(await req.json().catch(() => ({})));
  try {
    const { restaurantId } = await requireRestaurantUser();

    const result = await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${params.tableId}))::text AS "locked"`;
        const current = await getCurrentTableSession(
          tx,
          params.tableId,
          restaurantId,
        );
        if (!current)
          return { error: "This table has no open tab to bill." } as const;
        if (body.tableSessionId && body.tableSessionId !== current.id) {
          return {
            error: "This table tab has already changed. Open the table again.",
          } as const;
        }

        const [session, table, restaurant] = await Promise.all([
          tx.tableSession.findFirst({
            where: { id: current.id, restaurantId, status: "OPEN" },
            include: {
              orders: {
                where: { status: { not: "CANCELLED" } },
                include: { items: true },
                orderBy: { createdAt: "asc" },
              },
            },
          }),
          tx.table.findFirst({
            where: { id: params.tableId, restaurantId },
            select: { id: true, label: true },
          }),
          tx.restaurant.findUnique({
            where: { id: restaurantId },
            select: {
              taxName: true,
              taxPercent: true,
              additionalTaxes: true,
              discountActive: true,
              discountPercent: true,
              discountName: true,
            },
          }),
        ]);
        if (!session || !table || !restaurant)
          return { error: "Table not found." } as const;
        if (!session.orders.length)
          return { error: "There are no orders on this table yet." } as const;

        const aggregated = new Map<
          string,
          {
            name: string;
            unitPrice: number;
            quantity: number;
            subtotal: number;
          }
        >();
        for (const order of session.orders)
          for (const item of order.items) {
            const servedQuantity = Math.max(
              0,
              Math.min(item.quantity, item.servedQuantity),
            );
            if (servedQuantity === 0) continue;
            const key = `${item.nameSnapshot}:${item.priceCentsSnapshot}`;
            const line = aggregated.get(key) ?? {
              name: item.nameSnapshot,
              unitPrice: item.priceCentsSnapshot,
              quantity: 0,
              subtotal: 0,
            };
            line.quantity += servedQuantity;
            line.subtotal += item.priceCentsSnapshot * servedQuantity;
            aggregated.set(key, line);
          }
        const items = [...aggregated.values()];
        if (!items.length)
          return {
            error:
              "No served items are billable yet. Mark served items in the Orders panel first.",
          } as const;

        const subtotalCents = items.reduce(
          (sum, item) => sum + item.subtotal,
          0,
        );
        const discountPercent = restaurant.discountActive
          ? (restaurant.discountPercent ?? 0)
          : 0;
        const discountCents = Math.round(
          (subtotalCents * discountPercent) / 100,
        );
        const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
        const taxBreakdown = calculateTaxBreakdown(
          discountedSubtotal,
          getTaxRates(
            restaurant.taxName,
            restaurant.taxPercent,
            restaurant.additionalTaxes,
          ),
        );
        const { taxPercent, taxName, taxCents } = taxSummary(taxBreakdown);
        const packingCents = subtotalCents > 0 ? PACKING_CENTS : 0;
        const totalCents = discountedSubtotal + taxCents + packingCents;

        const billData = {
          tableId: table.id,
          tableLabel: table.label,
          tableSessionId: session.id,
          customerName:
            session.orders.find((order) => order.customerName)?.customerName ||
            null,
          customerPhone:
            session.orders.find((order) => order.customerPhone)
              ?.customerPhone || null,
          customerEmail:
            session.orders.find((order) => order.customerEmail)
              ?.customerEmail || null,
          orderCount: session.orders.length,
          subtotalCents,
          discountCents,
          discountPercent,
          discountName: discountPercent
            ? restaurant.discountName || "Special Offer"
            : null,
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

        const existing = await tx.bill.findFirst({
          where: { restaurantId, tableSessionId: session.id },
          orderBy: { createdAt: "desc" },
        });
        if (existing?.paymentStatus === "PAID")
          return { error: "This table tab is already settled." } as const;

        let bill;
        if (existing) {
          bill = await tx.bill.update({
            where: { id: existing.id },
            data: {
              shareToken:
                existing.shareToken || randomBytes(32).toString("base64url"),
              ...billData,
            },
          });
        } else {
          await tx.$queryRaw`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`;
          const lastBill = await tx.bill.findFirst({
            where: { restaurantId },
            orderBy: { billNumber: "desc" },
            select: { billNumber: true },
          });
          bill = await tx.bill.create({
            data: {
              restaurantId,
              billNumber: (lastBill?.billNumber ?? 1000) + 1,
              shareToken: randomBytes(32).toString("base64url"),
              ...billData,
            },
          });
        }

        await tx.tableSession.updateMany({
          where: { id: session.id, restaurantId },
          data: { billRequestedAt: null },
        });

        // Close the guest's pending bill request in the admin inbox.
        const resolved = await tx.serviceRequest.findMany({
          where: {
            restaurantId,
            tableSessionId: session.id,
            requests: { has: "pay_bill" },
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
          select: {
            id: true,
            tableId: true,
            tableSessionId: true,
            tableLabel: true,
            requests: true,
            custom: true,
            status: true,
            createdAt: true,
          },
        });
        if (resolved.length) {
          await tx.serviceRequest.updateMany({
            where: { id: { in: resolved.map((request) => request.id) } },
            data: { status: "COMPLETED" },
          });
        }

        return {
          bill,
          tableId: table.id,
          resolved: resolved.map((request) => ({
            ...request,
            status: "COMPLETED" as const,
          })),
        } as const;
      },
      { maxWait: 15000, timeout: 25000 },
    );

    if ("error" in result)
      return Response.json({ error: result.error }, { status: 409 });

    const billUrl = `${getPublicAppUrl(req.url)}/bill/${result.bill.shareToken}`;

    // Deliver instantly to the guest's table tab + the cashier's own screens.
    void emitOrderEvent({
      restaurantId,
      type: "bill_updated",
      data: {
        billId: result.bill.id,
        billNumber: result.bill.billNumber,
        tableId: result.tableId,
        tableSessionId: result.bill.tableSessionId,
        shareToken: result.bill.shareToken,
        totalCents: result.bill.totalCents,
      },
    });
    for (const request of result.resolved) {
      void emitOrderEvent({
        restaurantId,
        type: "service_request_updated",
        data: { request },
      });
    }

    return Response.json({ bill: result.bill, billUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json({ error: "Invalid bill request" }, { status: 400 });
    console.error("[table-bill:generate]", error);
    return tenantErrorResponse(error);
  }
}
