import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const dashboardView = new URL(request.url).searchParams.get("view") === "dashboard";
    const orders = await db.order.findMany({
      where: { restaurantId },
      select: dashboardView ? {
        id: true,
        orderNumber: true,
        status: true,
        totalCents: true,
        customerName: true,
        createdAt: true,
        items: { select: { nameSnapshot: true, quantity: true } },
        table: { select: { label: true } },
      } : {
        id: true,
        orderNumber: true,
        status: true,
        totalCents: true,
        customerName: true,
        customerPhone: true,
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
          },
        },
        table: { select: { label: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
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
