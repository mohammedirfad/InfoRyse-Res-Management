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

    const orders = await db.order.findMany({
      where: {
        restaurantId,
        createdAt: { gt: since },
      },
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
    });

    return Response.json({ orders }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
