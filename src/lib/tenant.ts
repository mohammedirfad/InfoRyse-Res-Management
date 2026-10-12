import { getSession } from "./auth";

/**
 * TENANT ISOLATION — read this before touching any /api/admin/* route.
 *
 * Every admin API route MUST call one of these helpers FIRST, and MUST use
 * the returned restaurantId in every subsequent database query's `where`
 * clause. NEVER use a restaurantId that was sent by the client (body, query
 * string, header) for a WRITE or a scoped READ — always use the one that
 * came out of the signed session cookie. This is the one rule in this whole
 * codebase that has zero room for shortcuts.
 */

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

/** For OWNER/STAFF routes — guarantees a restaurantId tied to this user's own session. */
export async function requireRestaurantUser() {
  const session = await getSession();
  if (!session) throw new UnauthorizedError("Not logged in");
  if (session.role !== "OWNER" && session.role !== "STAFF") {
    throw new ForbiddenError("Not a restaurant user");
  }
  if (!session.restaurantId) throw new ForbiddenError("No restaurant on session");
  return { userId: session.userId, role: session.role, restaurantId: session.restaurantId };
}

/** For /super/* routes only. */
export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) throw new UnauthorizedError("Not logged in");
  if (session.role !== "SUPER_ADMIN") throw new ForbiddenError("Not a super admin");
  return { userId: session.userId };
}

/** Standard error → HTTP response mapping for route handlers. */
export function tenantErrorResponse(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  console.error(err); // goes to Sentry/logs — never leak internals to the client
  return Response.json({ error: "Internal error" }, { status: 500 });
}
