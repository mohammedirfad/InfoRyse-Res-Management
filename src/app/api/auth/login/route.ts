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

    const user = await db.user.findUnique({
      where: { email },
      include: { restaurant: { select: { isActive: true, name: true } } },
    });

    // Check credential correctness
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Check if restaurant is suspended/blocked by Super Admin
    if (user.restaurant && !user.restaurant.isActive) {
      return Response.json(
        { error: `Account Suspended: ${user.restaurant.name} has been deactivated or blocked by Super Administration. Please contact support@inforyse.com.` },
        { status: 403 }
      );
    }

    const code = await issueOtp(user.id, "LOGIN_2FA", user.email);

    return Response.json({
      step: "OTP_REQUIRED",
      userId: user.id,
      devOtp: code,
    });
  } catch (err) {
    console.error("[auth:login]", err);
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
