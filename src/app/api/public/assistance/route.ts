import { z } from "zod";
import { db } from "@/lib/db";
import { emitOrderEvent } from "@/lib/events";
import { getCurrentTableSession } from "@/lib/tableSessions";

export const dynamic = "force-dynamic";

const allowedRequests = new Set([
  "pay_bill", "wifi", "water", "waiter", "cutlery", "lighter", "sauce",
  "ice", "tissues", "packing", "chair", "cake", "candle", "birthday",
]);

const BodySchema = z.object({
  slug: z.string().min(1).max(100),
  qrToken: z.string().min(1).max(200),
  tableLabel: z.string().max(100).optional(),
  requests: z.array(z.string()).max(10),
  custom: z.string().trim().max(300).optional(),
});

/** Public QR service requests are persisted as service requests, never as orders. */
export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const requests = [...new Set(body.requests)];
    if (requests.length === 0 && !body.custom?.trim()) {
      return Response.json({ ok: false, error: "Choose a request or enter a message." }, { status: 400 });
    }
    if (requests.some((request) => !allowedRequests.has(request))) {
      return Response.json({ ok: false, error: "Unknown service request." }, { status: 400 });
    }

    const restaurant = await db.restaurant.findUnique({
      where: { slug: body.slug },
      select: { id: true, isActive: true },
    });
    if (!restaurant?.isActive) return Response.json({ ok: false }, { status: 404 });

    const table = await db.table.findFirst({
      where: { qrToken: body.qrToken, restaurantId: restaurant.id, deletedAt: null },
      select: { id: true, label: true },
    });
    if (!table) return Response.json({ ok: false }, { status: 404 });

    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${table.id}))::text AS "locked"`;
      const session = await getCurrentTableSession(tx, table.id, restaurant.id);
      if (requests.includes("pay_bill") && !session) {
        return { error: "There is no open bill for this table yet." } as const;
      }

      if (session && requests.length === 1 && requests[0] === "pay_bill") {
        const existing = await tx.serviceRequest.findFirst({
          where: {
            restaurantId: restaurant.id,
            tableSessionId: session.id,
            requests: { has: "pay_bill" },
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
          orderBy: { createdAt: "desc" },
        });
        if (existing) return { request: existing, duplicate: true } as const;
      }

      const request = await tx.serviceRequest.create({
        data: {
          restaurantId: restaurant.id,
          tableId: table.id,
          tableSessionId: session?.id ?? null,
          tableLabel: table.label,
          requests,
          custom: body.custom || null,
        },
      });

      if (session && requests.includes("pay_bill")) {
        await tx.tableSession.updateMany({
          where: { id: session.id, restaurantId: restaurant.id, status: "OPEN" },
          data: { billRequestedAt: new Date() },
        });
      }
      return { request, duplicate: false } as const;
    });

    if ("error" in result) return Response.json({ ok: false, error: result.error }, { status: 409 });

    if (!result.duplicate) {
      void emitOrderEvent({
        restaurantId: restaurant.id,
        type: "service_request_created",
        data: {
          request: {
            id: result.request.id,
            tableId: table.id,
            tableLabel: table.label,
            tableSessionId: result.request.tableSessionId,
            requests: result.request.requests,
            custom: result.request.custom,
            status: result.request.status,
            createdAt: result.request.createdAt.toISOString(),
          },
        },
      });
    }

    return Response.json({ ok: true, duplicate: result.duplicate }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ ok: false, error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }
    console.error("[service-request]", error);
    return Response.json({ ok: false, error: "Could not send your request. Please try again." }, { status: 500 });
  }
}
