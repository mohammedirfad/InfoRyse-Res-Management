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
    const days = dashboardView ? 2 : analyticsView ? 3660 : 30;
    const createdAfter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const orders = await db.order.findMany({
      // Legacy assistance tickets were stored as zero-value placeholder orders.
      // Keep them out of the Orders tab; new assistance now uses ServiceRequest.
      where: {
        restaurantId,
        createdAt: { gte: createdAfter },
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
            orderNumber: true,
            status: true,
            totalCents: true,
            customerName: true,
            customerPhone: true,
            customerEmail: true,
            notes: true,
            orderType: true,
            paymentMethod: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                nameSnapshot: true,
                priceCentsSnapshot: true,
                quantity: true,
                servedQuantity: true,
                cancelledQuantity: true,
                menuItemId: true,
              },
            },
            table: { select: { label: true } },
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
