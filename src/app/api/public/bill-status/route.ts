import { db } from "@/lib/db";
import { getCurrentTableSession } from "@/lib/tableSessions";

export const dynamic = "force-dynamic";

/**
 * One tiny endpoint that answers "what is the state of my table tab?".
 *
 * The guest screens (menu, table tab, confirmation) call this instead of three
 * different endpoints, and they call it with `guestSessionQuery()`, so a guest
 * who reloads or rescans the QR always gets their own open tab back:
 *
 *  - the QR token identifies the table and restaurant (never trusted from the
 *    client for anything else),
 *  - `sessionId` is only honoured when it belongs to that same table and is
 *    still OPEN,
 *  - otherwise the newest OPEN session for the table is used, and the id is
 *    echoed back so the browser can re-persist it.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const qrToken = url.searchParams.get("qrToken");
    const requestedSessionId = url.searchParams.get("sessionId");

    if (!slug || !qrToken) {
      return Response.json(
        { error: "Missing slug or qrToken" },
        { status: 400 },
      );
    }

    const table = await db.table.findFirst({
      where: { qrToken, restaurant: { slug, isActive: true }, deletedAt: null },
      select: {
        id: true,
        label: true,
        status: true,
        restaurantId: true,
      },
    });
    if (!table)
      return Response.json({ error: "Table not found" }, { status: 404 });

    // Restore the exact tab when the browser still remembers it.
    let session = requestedSessionId
      ? await db.tableSession.findFirst({
          where: {
            id: requestedSessionId,
            tableId: table.id,
            restaurantId: table.restaurantId,
            status: "OPEN",
          },
          select: { id: true, createdAt: true, billRequestedAt: true },
        })
      : null;

    if (!session) {
      const current = await getCurrentTableSession(
        db,
        table.id,
        table.restaurantId,
      );
      if (current) {
        session = {
          id: current.id,
          createdAt: current.createdAt,
          billRequestedAt: current.billRequestedAt ?? null,
        };
      }
    }

    if (!session) {
      return Response.json(
        {
          tableId: table.id,
          tableLabel: table.label,
          tableSessionId: null,
          requestedAt: null,
          billToken: null,
          billNumber: null,
          paymentStatus: null,
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const [bill, request] = await Promise.all([
      db.bill.findFirst({
        where: { restaurantId: table.restaurantId, tableSessionId: session.id },
        orderBy: { createdAt: "desc" },
        select: { shareToken: true, billNumber: true, paymentStatus: true },
      }),
      db.serviceRequest.findFirst({
        where: {
          restaurantId: table.restaurantId,
          tableSessionId: session.id,
          requests: { has: "pay_bill" },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    return Response.json(
      {
        tableId: table.id,
        tableLabel: table.label,
        tableSessionId: session.id,
        requestedAt:
          session.billRequestedAt?.toISOString() ??
          request?.createdAt.toISOString() ??
          null,
        billToken: bill?.shareToken ?? null,
        billNumber: bill?.billNumber ?? null,
        paymentStatus: bill?.paymentStatus ?? null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("[public:bill-status]", err);
    return Response.json(
      { error: "Could not read the table bill" },
      { status: 500 },
    );
  }
}
