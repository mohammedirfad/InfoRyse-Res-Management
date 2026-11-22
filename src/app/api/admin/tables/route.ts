import { db } from "@/lib/db";
import { requireFastRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { buildCustomerMenuUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { restaurantId } = await requireFastRestaurantUser();
    const tables = await db.table.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: { label: "asc" },
      select: {
        id: true,
        label: true,
        section: true,
        capacity: true,
        status: true,
        qrToken: true,
        restaurant: { select: { slug: true } },
        sessions: {
          where: { status: "OPEN" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    });

    const sessionIds = tables.flatMap((table) => table.sessions.map((session) => session.id));
    const sessionTotals = sessionIds.length
      ? await db.order.groupBy({
          by: ["tableSessionId"],
          where: { tableSessionId: { in: sessionIds }, status: { notIn: ["CANCELLED", "COMPLETED"] } },
          _count: { _all: true },
          _sum: { subtotalCents: true },
        })
      : [];
    const totalsBySession = new Map(sessionTotals.map((entry) => [entry.tableSessionId, entry]));

    const mapped = tables.map((t) => {
      const activeSession = t.sessions?.[0] || null;
      const totals = activeSession ? totalsBySession.get(activeSession.id) : null;
      const activeOrderCount = totals?._count._all ?? 0;
      const hasActiveOrders = activeOrderCount > 0;

      return {
        id: t.id,
        label: t.label,
        section: t.section,
        capacity: t.capacity,
        status: hasActiveOrders ? "OCCUPIED" : t.status,
        qrToken: t.qrToken,
        menuUrl: buildCustomerMenuUrl(t.restaurant.slug, t.qrToken),
        hasActiveSession: Boolean(activeSession),
        activeOrderCount,
        activeSubtotalCents: totals?._sum.subtotalCents ?? 0,
      };
    });

    return new Response(JSON.stringify({ tables: mapped }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=2, stale-while-revalidate=8",
      },
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
