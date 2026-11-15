import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const CreateTicketSchema = z.object({
  subject: z.string().trim().min(4).max(160),
  category: z.enum(["Orders", "Billing", "Menu", "Tables & QR", "Account", "Other"]),
  message: z.string().trim().min(10).max(5000),
});

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const url = new URL(request.url);
    const page = Math.max(0, Math.min(1000, Number(url.searchParams.get("page") || 0) || 0));
    const status = url.searchParams.get("status");
    const validStatuses = ["OPEN", "IN_PROGRESS", "WAITING_ON_RESTAURANT", "RESOLVED", "CLOSED"] as const;
    const tickets = await db.supportTicket.findMany({
      where: { restaurantId, ...(validStatuses.includes(status as typeof validStatuses[number]) ? { status: status as typeof validStatuses[number] } : {}) },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: page * 25,
      take: 26,
      select: {
        id: true, subject: true, category: true, status: true, createdAt: true, updatedAt: true,
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, authorName: true, authorRole: true, createdAt: true } },
      },
    });
    return Response.json({ tickets: tickets.slice(0, 25), hasMore: tickets.length > 25 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRestaurantUser();
    const limit = checkRateLimit(`support-ticket-create:${actor.userId}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) return Response.json({ error: "Please wait before opening another support ticket." }, { status: 429 });
    const parsed = CreateTicketSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check the ticket details." }, { status: 400 });
    const user = await db.user.findUnique({ where: { id: actor.userId }, select: { name: true, email: true } });
    if (!user) return Response.json({ error: "Your account could not be verified." }, { status: 401 });
    const authorName = user.name?.trim() || user.email;
    const ticket = await db.supportTicket.create({
      data: {
        restaurantId: actor.restaurantId,
        createdByUserId: actor.userId,
        createdByName: authorName,
        createdByEmail: user.email,
        subject: parsed.data.subject,
        category: parsed.data.category,
        messages: { create: { authorUserId: actor.userId, authorName, authorRole: actor.role, body: parsed.data.message } },
      },
      select: { id: true, subject: true, category: true, status: true, createdAt: true, updatedAt: true },
    });
    return Response.json({ ticket }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
