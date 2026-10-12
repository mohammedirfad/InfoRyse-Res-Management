import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/table-session/{id}/finalize
 * Closes the session and marks the table as Available.
 * Called by staff when the guests are done and the bill is ready to print.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { restaurantId } = await requireRestaurantUser();

    const session = await db.tableSession.findFirst({
      where: { id: params.id, restaurantId },
    });
    if (!session) return Response.json({ error: "Session not found" }, { status: 404 });
    if (session.status !== "OPEN") {
      return Response.json({ error: "Session is already finalized" }, { status: 409 });
    }

    await db.$transaction([
      // Mark session finalized
      db.tableSession.update({
        where: { id: session.id },
        data:  { status: "FINALIZED", finalizedAt: new Date() },
      }),
      // Mark table Available again
      db.table.update({
        where: { id: session.tableId },
        data:  { status: "AVAILABLE" },
      }),
    ]);

    return Response.json({ ok: true });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
