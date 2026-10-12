import { z } from "zod";
import { db } from "@/lib/db";
import { verifyOtp, createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ userId: z.string().uuid(), code: z.string().length(6) });

export async function POST(req: Request) {
  try {
    const { userId, code } = BodySchema.parse(await req.json());

    const ok = await verifyOtp(userId, "LOGIN_2FA", code);
    if (!ok) return Response.json({ error: "Invalid or expired code" }, { status: 401 });

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    await createSession({ userId: user.id, role: user.role, restaurantId: user.restaurantId });

    return Response.json({ ok: true, role: user.role });
  } catch (err) {
    console.error("[auth:verify-otp]", err);
    return Response.json({ error: "Verification failed" }, { status: 500 });
  }
}
