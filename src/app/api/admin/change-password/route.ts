import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match",
  path: ["confirmPassword"],
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = BodySchema.parse(await req.json());

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current temporary password
    const validCurrent = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!validCurrent) {
      return Response.json({ error: "Current temporary password is incorrect" }, { status: 400 });
    }

    if (body.newPassword === body.currentPassword) {
      return Response.json({ error: "New password cannot be the same as the temporary password" }, { status: 400 });
    }

    // Hash and update
    const newHash = await hashPassword(body.newPassword);
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false, // Lift requirement!
      },
    });

    return Response.json({ ok: true, message: "Password updated successfully" });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    console.error("[admin:change-password]", err);
    return Response.json({ error: "Failed to update password" }, { status: 500 });
  }
}
