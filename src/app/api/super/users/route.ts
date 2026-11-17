import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const requestUrl = new URL(request.url);
    const page = Math.max(1, Number(requestUrl.searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(10, Number(requestUrl.searchParams.get("limit") || 30)));
    const role = requestUrl.searchParams.get("role");
    const search = (requestUrl.searchParams.get("search") || "").trim();
    const where: any = {};
    if (["SUPER_ADMIN", "OWNER", "STAFF"].includes(role || "")) where.role = role;
    if (search) where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { restaurant: { name: { contains: search, mode: "insensitive" } } },
    ];
    const [users, total, roleCounts] = await Promise.all([
      db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        restaurantId: true,
        createdAt: true,
        restaurant: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      } }),
      db.user.count({ where }),
      db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    ]);
    return Response.json({ users, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, roleCounts: Object.fromEntries(roleCounts.map((item) => [item.role, item._count._all])) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
