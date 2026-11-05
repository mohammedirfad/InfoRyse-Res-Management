import { upgradeWebSocket } from "@vercel/functions";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { attachAdminRealtimeSocket, isAdminRedisRealtimeConfigured } from "@/lib/adminRedisRealtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  if (!isAdminRedisRealtimeConfigured()) {
    return Response.json({ error: "Admin realtime is not configured" }, { status: 503 });
  }
  let restaurantId: string;
  try {
    ({ restaurantId } = await requireRestaurantUser());
  } catch (error) {
    return tenantErrorResponse(error);
  }
  try {
    return await upgradeWebSocket((socket) => attachAdminRealtimeSocket(socket, restaurantId), { maxPayload: 1024 });
  } catch (error) {
    console.error("[admin-realtime:websocket] upgrade failed", error);
    return Response.json({ error: "Realtime connection could not be started" }, { status: 503 });
  }
}
