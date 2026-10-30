import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const rawSince = new URL(req.url).searchParams.get("since");
    const since = rawSince ? new Date(rawSince) : new Date();
    if (Number.isNaN(since.getTime())) {
      return Response.json({ error: "Invalid notification cursor" }, { status: 400 });
    }

    const [orders, serviceRequests] = await Promise.all([
      db.order.findMany({
        where: { restaurantId, createdAt: { gt: since }, NOT: { idempotencyKey: { startsWith: "assist_" } } },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          totalCents: true,
          createdAt: true,
          table: { select: { label: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 250,
      }),
      db.serviceRequest.findMany({
        where: { restaurantId, status: { in: ["PENDING", "IN_PROGRESS"] } },
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
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return Response.json({ orders, serviceRequests }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
