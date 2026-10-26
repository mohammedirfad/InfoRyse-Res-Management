import type { Prisma, PrismaClient } from "@prisma/client";

// A dining tab is shared by every device using the same physical table QR.
// Close abandoned tabs after four idle hours, and impose a 12-hour hard limit
// so an old session can never leak into the next day's visit.
export const TABLE_SESSION_IDLE_MS = 4 * 60 * 60 * 1000;
export const TABLE_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function getCurrentTableSession(
  client: DbClient,
  tableId: string,
  restaurantId: string,
) {
  const sessions = await client.tableSession.findMany({
    where: { tableId, restaurantId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      billRequestedAt: true,
      orders: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const now = Date.now();
  const cutoffIdle = now - TABLE_SESSION_IDLE_MS;
  const cutoffAge = now - TABLE_SESSION_MAX_AGE_MS;
  const activeSessions = sessions.filter((session) => {
    const lastActivity = session.orders[0]?.createdAt ?? session.createdAt;
    return session.createdAt.getTime() >= cutoffAge && lastActivity.getTime() >= cutoffIdle;
  });
  const active = activeSessions[0] ?? null;
  const expiredIds = sessions.filter((session) => !activeSessions.includes(session)).map((session) => session.id);

  // Repair any duplicate open tabs left by earlier concurrent requests: merge
  // their orders into the newest active table session before closing duplicates.
  const duplicateIds = activeSessions.slice(1).map((session) => session.id);
  if (active && duplicateIds.length) {
    await client.order.updateMany({
      where: { tableSessionId: { in: duplicateIds }, restaurantId },
      data: { tableSessionId: active.id },
    });
  }

  const closeIds = [...expiredIds, ...duplicateIds];
  if (closeIds.length) {
    await client.tableSession.updateMany({
      where: { id: { in: closeIds }, restaurantId, status: "OPEN" },
      data: { status: "FINALIZED", finalizedAt: new Date() },
    });
  }

  if (expiredIds.length) {
    await client.order.updateMany({
      where: {
        tableSessionId: { in: expiredIds },
        restaurantId,
        status: { in: ["NEW", "ACCEPTED", "PREPARING", "READY"] },
      },
      data: { status: "COMPLETED" },
    });
  }

  return active ?? null;
}

export async function getOrCreateCurrentTableSession(
  client: DbClient,
  tableId: string,
  restaurantId: string,
) {
  const current = await getCurrentTableSession(client, tableId, restaurantId);
  if (current) return current;
  return client.tableSession.create({
    data: { tableId, restaurantId, status: "OPEN" },
  });
}
