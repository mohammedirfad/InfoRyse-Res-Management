import { db } from "@/lib/db";
import { requireFastRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

function getCachedOrderStatusCounts(restaurantId: string) {
  return unstable_cache(
    () => db.order.groupBy({
      by: ["status"],
      where: {
        restaurantId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        NOT: { idempotencyKey: { startsWith: "assist_" } },
      },
      _count: { _all: true },
    }),
    ["admin-order-status-counts-v1", restaurantId],
    { revalidate: 5, tags: [`admin-order-status-counts:${restaurantId}`] },
  )();
}

const getCachedAnalytics = unstable_cache(async (restaurantId: string, startIso: string, endIso: string) => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const [summary, daily, hourly, types, topItems] = await Promise.all([
    db.$queryRaw<Array<{ orderCount: bigint; revenueCents: bigint; knownCustomers: bigint }>>`
      SELECT COUNT(*)::bigint AS "orderCount", COALESCE(SUM("totalCents"), 0)::bigint AS "revenueCents",
        COUNT(DISTINCT NULLIF("customerPhone", ''))::bigint AS "knownCustomers"
      FROM "Order" WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${start} AND "createdAt" <= ${end}
        AND "status" <> 'CANCELLED'::"OrderStatus" AND left("idempotencyKey", 7) <> 'assist_'`,
    db.$queryRaw<Array<{ day: Date; orders: bigint; revenueCents: bigint }>>`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kolkata') AS day, COUNT(*)::bigint AS orders,
        COALESCE(SUM("totalCents"), 0)::bigint AS "revenueCents"
      FROM "Order" WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${start} AND "createdAt" <= ${end}
        AND "status" <> 'CANCELLED'::"OrderStatus" AND left("idempotencyKey", 7) <> 'assist_'
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<Array<{ hour: number; orders: bigint }>>`
      SELECT EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Asia/Kolkata')::int AS hour, COUNT(*)::bigint AS orders
      FROM "Order" WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${start} AND "createdAt" <= ${end}
        AND "status" <> 'CANCELLED'::"OrderStatus" AND left("idempotencyKey", 7) <> 'assist_'
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<Array<{ orderType: string; orders: bigint }>>`
      SELECT COALESCE("orderType", 'DINE_IN') AS "orderType", COUNT(*)::bigint AS orders
      FROM "Order" WHERE "restaurantId" = ${restaurantId} AND "createdAt" >= ${start} AND "createdAt" <= ${end}
        AND "status" <> 'CANCELLED'::"OrderStatus" AND left("idempotencyKey", 7) <> 'assist_'
      GROUP BY 1`,
    db.$queryRaw<Array<{ name: string; quantity: bigint; revenueCents: bigint }>>`
      SELECT item."nameSnapshot" AS name, SUM(item."quantity")::bigint AS quantity,
        SUM(item."quantity" * item."priceCentsSnapshot")::bigint AS "revenueCents"
      FROM "OrderItem" AS item JOIN "Order" AS order_row ON order_row."id" = item."orderId"
      WHERE order_row."restaurantId" = ${restaurantId} AND order_row."createdAt" >= ${start} AND order_row."createdAt" <= ${end}
        AND order_row."status" <> 'CANCELLED'::"OrderStatus" AND left(order_row."idempotencyKey", 7) <> 'assist_'
      GROUP BY item."nameSnapshot" ORDER BY quantity DESC LIMIT 5`,
  ]);
  const totals = summary[0];
  return {
    orderCount: Number(totals?.orderCount ?? 0),
    revenueCents: Number(totals?.revenueCents ?? 0),
    knownCustomers: Number(totals?.knownCustomers ?? 0),
    daily: daily.map((row) => ({ day: row.day.toISOString(), orders: Number(row.orders), revenueCents: Number(row.revenueCents) })),
    hourly: hourly.map((row) => ({ hour: row.hour, orders: Number(row.orders) })),
    orderTypes: types.map((row) => ({ orderType: row.orderType, orders: Number(row.orders) })),
    topItems: topItems.map((row) => ({ name: row.name, quantity: Number(row.quantity), revenueCents: Number(row.revenueCents) })),
  };
}, ["admin-analytics-sql-v1"], { revalidate: 60 });

export async function GET(request: Request) {
  try {
    const { restaurantId, role } = await requireFastRestaurantUser();
    const url = new URL(request.url);
    const dashboardView = url.searchParams.get("view") === "dashboard";
    const analyticsView = url.searchParams.get("view") === "analytics";
    const paginatedView = !dashboardView && !analyticsView;
    // Dashboard only needs today's meals; the orders board needs the recent
    // window. Filtering in SQL keeps the payload small and the response fast.
    const days = dashboardView ? 2 : 30;
    const createdAt: { gte: Date; lte?: Date } = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    if (analyticsView) {
      if (role !== "OWNER") return Response.json({ error: "Forbidden" }, { status: 403 });
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        createdAt.gte = new Date(`${from}T00:00:00.000+05:30`);
        createdAt.lte = new Date(`${to}T23:59:59.999+05:30`);
        const rangeDays = (createdAt.lte.getTime() - createdAt.gte.getTime()) / 86400000;
        if (!Number.isFinite(rangeDays) || rangeDays < 0 || rangeDays > 366) {
          return Response.json({ error: "Choose a date range of one year or less." }, { status: 400 });
        }
      }
    }

    if (analyticsView) {
      const rangeEnd = createdAt.lte ?? new Date();
      const analytics = await getCachedAnalytics(restaurantId, createdAt.gte.toISOString(), rangeEnd.toISOString());
      return Response.json({ analytics }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const baseWhere: any = {
      restaurantId,
      createdAt,
      NOT: { idempotencyKey: { startsWith: "assist_" } },
    };
    const where: any = { ...baseWhere };
    const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "25", 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 25));
    const requestedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const page = Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1);

    if (paginatedView) {
      const status = url.searchParams.get("status") ?? "all";
      if (status === "new") where.status = { in: ["NEW", "ACCEPTED"] };
      else if (["preparing", "ready", "completed", "cancelled"].includes(status)) {
        where.status = status.toUpperCase();
      }
      const search = url.searchParams.get("search")?.trim();
      if (search) {
        const orderNumber = Number.parseInt(search.replace(/^#/, ""), 10);
        where.OR = [
          ...(Number.isFinite(orderNumber) ? [{ orderNumber }] : []),
          { customerName: { contains: search, mode: "insensitive" } },
          { customerPhone: { contains: search, mode: "insensitive" } },
          { table: { is: { label: { contains: search, mode: "insensitive" } } } },
          { items: { some: { nameSnapshot: { contains: search, mode: "insensitive" } } } },
        ];
      }
    }

    const orderSelect = {
      id: true,
      orderNumber: true,
      status: true,
      totalCents: true,
      orderType: true,
      paymentMethod: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      notes: true,
      createdAt: true,
      table: { select: { label: true } },
      items: {
        select: {
          id: true,
          menuItemId: true,
          nameSnapshot: true,
          quantity: true,
          servedQuantity: true,
          cancelledQuantity: true,
          priceCentsSnapshot: true,
        },
      },
    } as const;
    const [orders, total, groupedStatuses] = await Promise.all([
      db.order.findMany({
      // Legacy assistance tickets were stored as zero-value placeholder orders.
      // Keep them out of the Orders tab; new assistance now uses ServiceRequest.
      where,
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
        : orderSelect,
      orderBy: { createdAt: "desc" },
      ...(paginatedView ? { skip: (page - 1) * limit, take: limit } : { take: 200 }),
      } as any),
      paginatedView ? db.order.count({ where }) : Promise.resolve(0),
      paginatedView ? getCachedOrderStatusCounts(restaurantId) : Promise.resolve([]),
    ]);

    const responseBody = paginatedView
      ? {
          orders,
          pagination: { page, limit, total, hasMore: page * limit < total },
          statusCounts: Object.fromEntries(groupedStatuses.map((entry: any) => [entry.status, entry._count._all])),
        }
      : { orders };

    return new Response(JSON.stringify(responseBody), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
