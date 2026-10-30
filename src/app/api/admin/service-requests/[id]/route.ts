import { z } from "zod";
import { db } from "@/lib/db";
import { emitOrderEvent } from "@/lib/events";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const Body = z.object({ status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId, userId } = await requireRestaurantUser();
    const { status } = Body.parse(await req.json());
    const current = await db.serviceRequest.findFirst({ where: { id: params.id, restaurantId } });
    if (!current) return Response.json({ error: "Service request not found." }, { status: 404 });
    if (current.status === "COMPLETED" || current.status === "CANCELLED") {
      return Response.json({ error: "This request is already closed." }, { status: 409 });
    }

    const updated = await db.serviceRequest.updateMany({
      where: { id: current.id, restaurantId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      data: { status, handledBy: userId },
    });
    if (!updated.count) return Response.json({ error: "This request was already updated." }, { status: 409 });
    if (status === "COMPLETED" || status === "CANCELLED") {
      if (current.tableSessionId && current.requests.includes("pay_bill")) {
        await db.tableSession.updateMany({ where: { id: current.tableSessionId, restaurantId }, data: { billRequestedAt: null } });
      }
    }
    const request = await db.serviceRequest.findUniqueOrThrow({
      where: { id: current.id },
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
    await emitOrderEvent({ restaurantId, type: "service_request_updated", data: { request } });
    return Response.json({ request });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Invalid status." }, { status: 400 });
    return tenantErrorResponse(error);
  }
}
