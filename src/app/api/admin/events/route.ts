import { requireRestaurantUser } from "@/lib/tenant";
import { createRealtimeEventStream } from "@/lib/supabaseRealtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    return createRealtimeEventStream(req, `restaurant:${restaurantId}`, true);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
