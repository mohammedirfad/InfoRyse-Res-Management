import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { buildCustomerMenuUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const restaurant = await db.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    const tables = await db.table.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: { label: "asc" },
      include: {
        sessions: {
          where: { status: "OPEN" },
          take: 1,
          include: {
            orders: {
              where: { status: { notIn: ["CANCELLED", "COMPLETED"] } },
              select: { id: true, subtotalCents: true },
            },
          },
        },
      },
    });

    const mapped = tables.map((t) => {
      const activeSession = t.sessions?.[0] || null;
      const activeOrders = activeSession?.orders || [];
      const hasActiveOrders = activeOrders.length > 0;
      const activeSubtotal = activeOrders.reduce((s, o) => s + o.subtotalCents, 0);

      return {
        id: t.id,
        label: t.label,
        section: t.section,
        capacity: t.capacity,
        status: hasActiveOrders ? "OCCUPIED" : t.status,
        qrToken: t.qrToken,
        menuUrl: buildCustomerMenuUrl(restaurant.slug, t.qrToken),
        hasActiveSession: Boolean(activeSession),
        activeOrderCount: activeOrders.length,
        activeSubtotalCents: activeSubtotal,
      };
    });

    return new Response(JSON.stringify({ tables: mapped }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
