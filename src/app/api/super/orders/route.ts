import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireSuperAdmin();
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") || 50)));
    const status = url.searchParams.get("status");
    const search = (url.searchParams.get("search") || "").trim();
    const where: any = { NOT: { idempotencyKey: { startsWith: "assist_" } } };
    if (status && status !== "all") where.status = status;
    if (search) {
      const orderNumber = Number(search.replace(/^#/, ""));
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { restaurant: { name: { contains: search, mode: "insensitive" } } },
        ...(Number.isInteger(orderNumber) ? [{ orderNumber }] : []),
      ];
    }
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit,
        select: {
          id: true, orderNumber: true, status: true, totalCents: true, customerName: true, createdAt: true,
          table: { select: { label: true } }, restaurant: { select: { id: true, name: true } },
          items: { select: { nameSnapshot: true, quantity: true, priceCentsSnapshot: true } },
        },
      }),
      db.order.count({ where }),
    ]);
    const [byStatus, amount] = await Promise.all([
      db.order.groupBy({ by: ["status"], where: { NOT: { idempotencyKey: { startsWith: "assist_" } } }, _count: { _all: true } }),
      db.order.aggregate({ where: { NOT: { idempotencyKey: { startsWith: "assist_" } } }, _sum: { totalCents: true } }),
    ]);
    return Response.json({
      orders,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      stats: {
        total,
        completed: byStatus.find((entry) => entry.status === "COMPLETED")?._count._all ?? 0,
        cancelled: byStatus.find((entry) => entry.status === "CANCELLED")?._count._all ?? 0,
        orderValueCents: amount._sum.totalCents ?? 0,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
