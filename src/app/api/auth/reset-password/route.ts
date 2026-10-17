import { z } from "zod";
import { db } from "@/lib/db";
import { verifyOtp, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  userId: z.string().min(1),
  code: z.string().length(6, "Verification code must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const { userId, code, newPassword } = BodySchema.parse(await req.json());

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return Response.json({ error: "User account not found." }, { status: 404 });
    }

    const validOtp = await verifyOtp(userId, "PASSWORD_RESET", code);
    if (!validOtp) {
      return Response.json(
        { error: "Invalid or expired verification code. Please request a new code." },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);

    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return Response.json({
      ok: true,
      message: "Password reset successfully! You can now sign in with your new password.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    console.error("[auth:reset-password]", err);
    return Response.json({ error: "Failed to reset password. Please try again." }, { status: 500 });
  }
}
