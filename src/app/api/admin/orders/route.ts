import { db } from "@/lib/db";
import { requireFastRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireFastRestaurantUser();
    const url = new URL(request.url);
    const dashboardView = url.searchParams.get("view") === "dashboard";
    const analyticsView = url.searchParams.get("view") === "analytics";
    // Dashboard only needs today's meals; the orders board needs the recent
    // window. Filtering in SQL keeps the payload small and the response fast.
    const days = dashboardView ? 2 : 30;
    const createdAt: { gte: Date; lte?: Date } = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    if (analyticsView) {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        createdAt.gte = new Date(`${from}T00:00:00.000Z`);
        createdAt.lte = new Date(`${to}T23:59:59.999Z`);
        const rangeDays = (createdAt.lte.getTime() - createdAt.gte.getTime()) / 86400000;
        if (!Number.isFinite(rangeDays) || rangeDays < 0 || rangeDays > 366) {
          return Response.json({ error: "Choose a date range of one year or less." }, { status: 400 });
        }
      }
    }

    const orders = await db.order.findMany({
      // Legacy assistance tickets were stored as zero-value placeholder orders.
      // Keep them out of the Orders tab; new assistance now uses ServiceRequest.
      where: {
        restaurantId,
        createdAt,
        NOT: { idempotencyKey: { startsWith: "assist_" } },
      },
      select: dashboardView
        ? {
            id: true,
            orderNumber: true,
            status: true,
            totalCents: true,
            customerName: true,
            customerPhone: true,
            createdAt: true,
            items: { select: { nameSnapshot: true, quantity: true } },
            table: { select: { label: true } },
          }
        : {
            id: true,
            status: true,
            totalCents: true,
            orderType: true,
            customerName: true,
            customerPhone: true,
            createdAt: true,
            items: {
              select: {
                nameSnapshot: true,
                quantity: true,
                priceCentsSnapshot: true,
              },
            },
          },
      orderBy: { createdAt: "desc" },
      take: analyticsView ? 10000 : 200,
    });

    return new Response(JSON.stringify({ orders }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
