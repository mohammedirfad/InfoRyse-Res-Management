import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const getDashboardPayload = unstable_cache(async () => {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 29);
    since.setUTCHours(0, 0, 0, 0);

    const [restaurants, activeRestaurants, users, activeTables, orders, bills, orderDays, revenueDays, topRestaurants] = await Promise.all([
      db.restaurant.count(),
      db.restaurant.count({ where: { isActive: true } }),
      db.user.count(),
      db.table.count({ where: { deletedAt: null } }),
      db.order.count({ where: { NOT: { idempotencyKey: { startsWith: "assist_" } } } }),
      db.bill.aggregate({ where: { paymentStatus: "PAID" }, _sum: { totalCents: true } }),
      db.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Order" WHERE "createdAt" >= ${since} AND left("idempotencyKey", 7) <> 'assist_'
        GROUP BY 1 ORDER BY 1`,
      db.$queryRaw<Array<{ day: Date; total: bigint | null }>>`
        SELECT date_trunc('day', "paidAt") AS day, COALESCE(SUM("totalCents"), 0)::bigint AS total
        FROM "Bill" WHERE "paymentStatus" = 'PAID' AND "paidAt" >= ${since}
        GROUP BY 1 ORDER BY 1`,
      db.restaurant.findMany({
        take: 5,
        orderBy: { orders: { _count: "desc" } },
        select: { id: true, name: true, slug: true, isActive: true, _count: { select: { orders: true, tables: { where: { deletedAt: null } } } } },
      }),
    ]);

    const dayKey = (value: Date) => value.toISOString().slice(0, 10);
    const orderMap = new Map(orderDays.map((row) => [dayKey(row.day), Number(row.count)]));
    const revenueMap = new Map(revenueDays.map((row) => [dayKey(row.day), Number(row.total ?? 0)]));
    const daily = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(since);
      date.setUTCDate(date.getUTCDate() + index);
      const day = dayKey(date);
      return { day, orders: orderMap.get(day) ?? 0, paidCents: revenueMap.get(day) ?? 0 };
    });

    return {
      stats: { restaurants, activeRestaurants, pausedRestaurants: restaurants - activeRestaurants, users, activeTables, orders, paidRevenueCents: bills._sum.totalCents ?? 0 },
      daily,
      topRestaurants,
      generatedAt: new Date().toISOString(),
    };
  }, ["super-dashboard-metrics-v2"], { revalidate: 30, tags: ["super-dashboard"] });

export async function GET() {
  try {
    await requireSuperAdmin();
    const payload = await getDashboardPayload();
    return Response.json(payload, { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
