import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, issueOtp } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function POST(req: Request) {
  try {
    const { email, password } = BodySchema.parse(await req.json());

    // Rate-limit login attempts per email, independent of every other account.
    const limit = checkRateLimit(`login:${email}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const user = await db.user.findUnique({ where: { email } });
    // Same generic error whether the email doesn't exist or the password is
    // wrong — don't let attackers enumerate valid emails.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const code = await issueOtp(user.id, "LOGIN_2FA"); // emailed to the user out-of-band

    return Response.json({
      step: "OTP_REQUIRED",
      userId: user.id,
      // DEV CONVENIENCE ONLY — remove this field once email sending (Resend/SMTP)
      // is wired up in issueOtp(). Never ship this to production: it defeats
      // the entire point of a second factor.
      ...(process.env.NODE_ENV !== "production" ? { devOtp: code } : {}),
    });
  } catch (err) {
    console.error("[auth:login]", err);
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
