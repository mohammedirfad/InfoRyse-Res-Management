import { db } from "@/lib/db";
import { requireFastRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireFastRestaurantUser();
    const url = new URL(request.url);
    const dashboardView = url.searchParams.get("view") === "dashboard";
    const analyticsView = url.searchParams.get("view") === "analytics";
    const paginatedView = !dashboardView && !analyticsView;
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
      statusHistory: { select: { status: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    } as const;
    const analyticsSelect = {
      id: true,
      status: true,
      totalCents: true,
      orderType: true,
      customerPhone: true,
      createdAt: true,
      items: { select: { nameSnapshot: true, quantity: true, priceCentsSnapshot: true } },
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
        : analyticsView ? analyticsSelect : orderSelect,
      orderBy: { createdAt: "desc" },
      ...(analyticsView ? { take: 10000 } : paginatedView ? { skip: (page - 1) * limit, take: limit } : { take: 200 }),
      } as any),
      paginatedView ? db.order.count({ where }) : Promise.resolve(0),
      paginatedView ? db.order.groupBy({ by: ["status"], where: baseWhere, _count: { _all: true } }) : Promise.resolve([]),
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
