import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_ON_RESTAURANT", "RESOLVED", "CLOSED"] as const;

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const url = new URL(request.url);
    const page = Math.max(0, Math.min(1000, Number(url.searchParams.get("page") || 0) || 0));
    const status = url.searchParams.get("status");
    const search = (url.searchParams.get("q") || "").trim().slice(0, 100);
    const tickets = await db.supportTicket.findMany({
      where: {
        ...(STATUSES.includes(status as typeof STATUSES[number]) ? { status: status as typeof STATUSES[number] } : {}),
        ...(search ? { OR: [
          { subject: { contains: search, mode: "insensitive" as const } },
          { createdByEmail: { contains: search, mode: "insensitive" as const } },
          { restaurant: { name: { contains: search, mode: "insensitive" as const } } },
        ] } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: page * 25,
      take: 26,
      select: {
        id: true, subject: true, category: true, status: true, createdAt: true, updatedAt: true,
        createdByName: true, createdByEmail: true,
        restaurant: { select: { id: true, name: true, slug: true, isActive: true } },
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, authorName: true, authorRole: true, createdAt: true } },
      },
    });
    return Response.json({ tickets: tickets.slice(0, 25), hasMore: tickets.length > 25 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
