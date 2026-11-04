import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { emitOrderEvent } from "@/lib/events";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const BodySchema = z.object({
  status: z.enum(["NEW", "ACCEPTED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const startedAt = performance.now();
  let authMs = 0;
  let databaseMs = 0;
  let broadcastMs = 0;
  try {
    const authStartedAt = performance.now();
    const { restaurantId, userId } = await requireRestaurantUser();
    authMs = performance.now() - authStartedAt;
    const { status: nextStatus } = BodySchema.parse(await req.json());

    // Update order, status history and billable item quantities in one
    // transaction statement. This avoids serial database round trips and
    // keeps final fulfillment serialized with table bill generation.
    const databaseStartedAt = performance.now();
    const allowedFrom = Object.entries(ALLOWED_TRANSITIONS)
      .filter(([, allowedTo]) => allowedTo.includes(nextStatus))
      .map(([status]) => status);
    if (allowedFrom.length === 0) {
      return Response.json({ error: "Orders cannot be moved back to New" }, { status: 409 });
    }
    const allowedSql = Prisma.join(allowedFrom.map((status) => Prisma.sql`${status}`));
    const rows = await db.$queryRaw<Array<{
      id: string;
      orderNumber: number;
      tableId: string | null;
      previousStatus: string;
      updated: boolean;
    }>>(Prisma.sql`
      WITH current_order AS MATERIALIZED (
        SELECT "id", "status", "tableId", "orderNumber"
        FROM "Order"
        WHERE "id" = ${params.id} AND "restaurantId" = ${restaurantId}
      ),
      table_lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(hashtext(current_order."tableId"))
        FROM current_order
        WHERE current_order."tableId" IS NOT NULL
          AND ${nextStatus} IN ('COMPLETED', 'CANCELLED')
      ),
      updated_order AS (
        UPDATE "Order" AS target
        SET "status" = ${nextStatus}::"OrderStatus"
        FROM current_order
        WHERE target."id" = current_order."id"
          AND target."status" = current_order."status"
          AND current_order."status"::text IN (${allowedSql})
          AND (current_order."tableId" IS NULL OR ${nextStatus} NOT IN ('COMPLETED', 'CANCELLED') OR EXISTS (SELECT 1 FROM table_lock))
        RETURNING target."id"
      ),
      status_history AS (
        INSERT INTO "OrderStatusHistory" ("id", "orderId", "status", "changedBy", "createdAt")
        SELECT ${randomUUID()}, updated_order."id", ${nextStatus}::"OrderStatus", ${userId}, NOW()
        FROM updated_order
        RETURNING "id"
      ),
      fulfilled_items AS (
        UPDATE "OrderItem" AS item
        SET "servedQuantity" = CASE WHEN ${nextStatus} = 'COMPLETED'
          THEN GREATEST(0, item."quantity" - item."cancelledQuantity")
          ELSE 0 END,
          "cancelledQuantity" = CASE WHEN ${nextStatus} = 'CANCELLED'
            THEN item."quantity" ELSE item."cancelledQuantity" END
        FROM updated_order
        WHERE item."orderId" = updated_order."id"
          AND ${nextStatus} IN ('COMPLETED', 'CANCELLED')
        RETURNING item."id"
      )
      SELECT current_order."id", current_order."orderNumber", current_order."tableId",
        current_order."status"::text AS "previousStatus",
        (updated_order."id" IS NOT NULL) AS "updated"
      FROM current_order LEFT JOIN updated_order ON TRUE
    `);
    databaseMs = performance.now() - databaseStartedAt;

    const order = rows[0];
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
    if (!order.updated) {
      const allowedFromCurrent = ALLOWED_TRANSITIONS[order.previousStatus] ?? [];
      const error = allowedFromCurrent.includes(nextStatus)
        ? "Order status changed while processing. Refresh and try again."
        : `Cannot move order from ${order.previousStatus} to ${nextStatus}`;
      return Response.json({ error }, { status: 409 });
    }

    const broadcastStartedAt = performance.now();
    await emitOrderEvent({
      restaurantId,
      type: "order_updated",
      data: { orderId: order.id, orderNumber: order.orderNumber, tableId: order.tableId, status: nextStatus },
    });
    broadcastMs = performance.now() - broadcastStartedAt;

    const serverTiming = `auth;dur=${authMs.toFixed(1)}, database;dur=${databaseMs.toFixed(1)}, broadcast;dur=${broadcastMs.toFixed(1)}, total;dur=${(performance.now() - startedAt).toFixed(1)}`;
    console.info("[order:status:timing]", serverTiming);
    return Response.json(
      { order: { id: order.id, orderNumber: order.orderNumber, tableId: order.tableId, status: nextStatus } },
      { headers: { "Server-Timing": serverTiming } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Invalid status" }, { status: 400 });
    }
    return tenantErrorResponse(error);
  }
}
