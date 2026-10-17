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
  try {
    const { email: rawEmail, password } = BodySchema.parse(await req.json());
    const email = rawEmail.toLowerCase();

    // Rate-limit login attempts per email, independent of every other account.
    const limit = checkRateLimit(`login:${email}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      return Response.json({ error: "Too many login attempts. Please wait a few minutes or reset your password." }, { status: 429 });
    }

    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: { restaurant: { select: { isActive: true, name: true } } },
    });

    // Check credential correctness
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "Invalid email or password. Please check your credentials or reset your password below." }, { status: 401 });
    }

    // Check if restaurant is suspended/blocked by Super Admin
    if (user.restaurant && !user.restaurant.isActive) {
      return Response.json(
        { error: `Account Suspended: ${user.restaurant.name} has been deactivated or blocked by Super Administration. Please contact support@inforyse.com.` },
        { status: 403 }
      );
    }

    // Direct login: establish secure HTTP-only session cookie
    await createSession({
      userId: user.id,
      role: user.role,
      restaurantId: user.restaurantId,
    });

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.errors[0]?.message || "Invalid input" }, { status: 400 });
    }
    console.error("[auth:login]", err?.message || err);
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
