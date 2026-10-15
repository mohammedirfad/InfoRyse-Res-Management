import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        restaurant: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
    });
    return Response.json({ users });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
