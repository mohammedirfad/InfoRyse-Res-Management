import { z } from "zod";
import { db } from "@/lib/db";
import { issueOtp } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export async function POST(req: Request) {
  try {
    const { email: rawEmail } = BodySchema.parse(await req.json());
    const email = rawEmail.trim().toLowerCase();

    // Rate-limit password reset requests per email
    const limit = checkRateLimit(`forgot:${email}`, 8, 15 * 60 * 1000);
    if (!limit.allowed) {
      return Response.json(
        { error: "Too many reset attempts for this email. Please wait 15 minutes before trying again." },
        { status: 429 }
      );
    }

    // Lookup user case-insensitively
    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return Response.json(
        { error: `No registered account found with "${email}". Please verify your email or contact support.` },
        { status: 404 }
      );
    }

    // Issue 6-digit OTP code for PASSWORD_RESET and dispatch real email via Gmail SMTP
    const code = await issueOtp(user.id, "PASSWORD_RESET", user.email);

    return Response.json({
      ok: true,
      userId: user.id,
      email: user.email,
      ...(process.env.NODE_ENV !== "production" ? { devOtp: code } : {}),
      message: `A 6-digit verification code has been dispatched to ${user.email}.`,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    console.error("[auth:forgot-password]", err);
    return Response.json({ error: "Failed to process password reset. Please try again." }, { status: 500 });
  }
}
