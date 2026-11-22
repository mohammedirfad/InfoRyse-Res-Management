import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";
import { checkSharedRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const MessageSchema = z.object({ message: z.string().trim().min(1).max(5000) });
const StatusSchema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_RESTAURANT", "RESOLVED", "CLOSED"]) });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const ticket = await db.supportTicket.findUnique({
      where: { id: params.id },
      include: {
        restaurant: { select: { id: true, name: true, slug: true, isActive: true } },
        messages: { orderBy: { createdAt: "asc" }, select: { id: true, authorName: true, authorRole: true, body: true, createdAt: true } },
      },
    });
    if (!ticket) return Response.json({ error: "Ticket not found." }, { status: 404 });
    return Response.json({ ticket }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireSuperAdmin();
    const limit = await checkSharedRateLimit(`support-ticket-message:${actor.userId}`, 60, 10 * 60 * 1000);
    if (!limit.allowed) return Response.json({ error: "You have sent several messages. Please try again shortly." }, { status: 429 });
    const parsed = MessageSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Message must contain 1–5000 characters." }, { status: 400 });
    const [ticket, user] = await Promise.all([
      db.supportTicket.findUnique({ where: { id: params.id }, select: { id: true, status: true } }),
      db.user.findUnique({ where: { id: actor.userId }, select: { name: true, email: true } }),
    ]);
    if (!ticket) return Response.json({ error: "Ticket not found." }, { status: 404 });
    if (!user) return Response.json({ error: "Your account could not be verified." }, { status: 401 });
    const status = ticket.status === "OPEN" ? "WAITING_ON_RESTAURANT" : ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "IN_PROGRESS" : ticket.status;
    await db.$transaction([
      db.supportTicketMessage.create({ data: { ticketId: ticket.id, authorUserId: actor.userId, authorName: user.name?.trim() || user.email, authorRole: "SUPER_ADMIN", body: parsed.data.message } }),
      db.supportTicket.update({ where: { id: ticket.id }, data: { status, resolvedAt: status === "IN_PROGRESS" ? null : undefined } }),
    ]);
    return Response.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const parsed = StatusSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Choose a valid ticket status." }, { status: 400 });
    const result = await db.supportTicket.updateMany({
      where: { id: params.id },
      data: { status: parsed.data.status, resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : null },
    });
    if (!result.count) return Response.json({ error: "Ticket not found." }, { status: 404 });
    return Response.json({ success: true, status: parsed.data.status }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
