import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";
import { sendEmail, buildBroadcastEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(150),
  message: z.string().trim().min(10, "Message must be at least 10 characters"),
  category: z.string().optional().default("Platform Notice"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const body = BodySchema.parse(await req.json());

    const restaurant = await db.restaurant.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        users: { where: { role: "OWNER" }, select: { email: true, name: true } },
      },
    });

    const targetEmail = restaurant.contactEmail || restaurant.users[0]?.email;
    const targetName = restaurant.ownerName || restaurant.users[0]?.name || restaurant.name;

    if (!targetEmail) {
      return Response.json({ error: "No owner email found for this restaurant" }, { status: 400 });
    }

    const emailHtml = buildBroadcastEmailHtml({
      restaurantName: restaurant.name,
      ownerName: targetName,
      subject: body.subject,
      message: body.message,
      category: body.category,
    });

    const result = await sendEmail({
      to: targetEmail,
      subject: `[${restaurant.name}] ${body.subject}`,
      html: emailHtml,
      text: `Hello ${targetName},\n\nNotice regarding ${restaurant.name}:\n\n${body.message}\n\nInfoRyse Super Administration`,
    });

    return Response.json({ ok: true, sentTo: targetEmail, success: result.success });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.errors[0]?.message || "Invalid input" }, { status: 400 });
    }
    return tenantErrorResponse(err);
  }
}
