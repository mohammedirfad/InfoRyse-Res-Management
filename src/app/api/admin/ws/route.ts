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
  return upgradeWebSocket((socket) => attachAdminRealtimeSocket(socket, restaurantId), { maxPayload: 1024 });
}
