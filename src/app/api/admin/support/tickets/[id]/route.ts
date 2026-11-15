import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const MessageSchema = z.object({ message: z.string().trim().min(1).max(5000) });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const ticket = await db.supportTicket.findFirst({
      where: { id: params.id, restaurantId },
      include: {
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
    const actor = await requireRestaurantUser();
    const limit = checkRateLimit(`support-ticket-message:${actor.userId}`, 30, 10 * 60 * 1000);
    if (!limit.allowed) return Response.json({ error: "You have sent several messages. Please try again shortly." }, { status: 429 });
    const parsed = MessageSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Message must contain 1–5000 characters." }, { status: 400 });
    const ticket = await db.supportTicket.findFirst({ where: { id: params.id, restaurantId: actor.restaurantId }, select: { id: true, status: true } });
    if (!ticket) return Response.json({ error: "Ticket not found." }, { status: 404 });
    const user = await db.user.findUnique({ where: { id: actor.userId }, select: { name: true, email: true } });
    if (!user) return Response.json({ error: "Your account could not be verified." }, { status: 401 });
    const status = ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "OPEN" : ticket.status;
    await db.$transaction([
      db.supportTicketMessage.create({ data: { ticketId: ticket.id, authorUserId: actor.userId, authorName: user.name?.trim() || user.email, authorRole: actor.role, body: parsed.data.message } }),
      db.supportTicket.update({ where: { id: ticket.id }, data: { status, resolvedAt: status === "OPEN" ? null : undefined } }),
    ]);
    return Response.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
