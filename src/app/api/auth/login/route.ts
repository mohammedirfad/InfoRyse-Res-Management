import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  const requestStartedAt = performance.now();
  let userLookupMs = 0;
  let passwordVerifyMs = 0;
  let sessionCreateMs = 0;
  try {
    const { email: rawEmail, password } = BodySchema.parse(await req.json());
    const email = rawEmail.toLowerCase();

    // Rate-limit login attempts per email, independent of every other account.
    const limit = checkRateLimit(`login:${email}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      return Response.json({ error: "Too many login attempts. Please wait a few minutes or reset your password." }, { status: 429 });
    }

    const lookupStartedAt = performance.now();
    const select = {
      id: true,
      email: true,
      role: true,
      restaurantId: true,
      passwordHash: true,
      restaurant: { select: { isActive: true, name: true } },
    } as const;
    // Account creation normalizes emails to lowercase, so the unique index is
    // the fast path. Keep the case-insensitive fallback for older accounts.
    const user = await db.user.findUnique({ where: { email }, select })
      ?? await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select });
    userLookupMs = performance.now() - lookupStartedAt;

    // Check credential correctness
    const passwordStartedAt = performance.now();
    const passwordValid = user ? await verifyPassword(password, user.passwordHash) : false;
    passwordVerifyMs = performance.now() - passwordStartedAt;
    if (!user || !passwordValid) {
      return Response.json({ error: "Invalid email or password. Please check your credentials or reset your password below." }, { status: 401 });
    }

    // Check if restaurant is suspended/blocked by Super Admin
    if (user.restaurant && !user.restaurant.isActive) {
      return Response.json(
        {
          code: "RESTAURANT_BLOCKED",
          error: `Sign-in is disabled because ${user.restaurant.name} has been blocked by InfoRyse administration. Contact support@inforyse.com for help.`,
        },
        { status: 403 }
      );
    }

    // Direct login: establish secure HTTP-only session cookie
    const sessionStartedAt = performance.now();
    await createSession({
      userId: user.id,
      role: user.role,
      restaurantId: user.restaurantId,
    });
    sessionCreateMs = performance.now() - sessionStartedAt;

    const totalMs = performance.now() - requestStartedAt;
    const serverTiming = `user_lookup;dur=${userLookupMs.toFixed(1)}, password_verify;dur=${passwordVerifyMs.toFixed(1)}, session_create;dur=${sessionCreateMs.toFixed(1)}, total;dur=${totalMs.toFixed(1)}`;
    console.info("[auth:login:timing]", serverTiming);

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    }, { headers: { "Server-Timing": serverTiming } });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.errors[0]?.message || "Invalid input" }, { status: 400 });
    }
    console.error("[auth:login]", err?.message || err);
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
