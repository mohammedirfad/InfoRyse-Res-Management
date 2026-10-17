import { db } from "@/lib/db";
import { issueOtp } from "@/lib/auth";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const owner = await db.user.findFirst({
      where: { restaurantId: params.id, role: "OWNER" },
      select: { id: true, email: true },
    });
    if (!owner) return Response.json({ error: "Restaurant owner account not found" }, { status: 404 });
    await issueOtp(owner.id, "PASSWORD_RESET", owner.email);
    return Response.json({ success: true, email: owner.email });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
