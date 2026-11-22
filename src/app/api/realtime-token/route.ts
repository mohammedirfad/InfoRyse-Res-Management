import { randomUUID } from "crypto";
import { SignJWT } from "jose";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { checkSharedRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const Schema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("restaurant") }),
  z.object({ scope: z.literal("table"), slug: z.string().min(1).max(100), qrToken: z.string().min(1).max(200) }),
]);

export async function POST(request: Request) {
  try {
    const body = Schema.parse(await request.json());
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY
      ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!jwtSecret || jwtSecret.length < 32 || !anonKey || !supabaseUrl) {
      return Response.json({ error: "Browser realtime is not configured" }, { status: 503 });
    }

    let claims: Record<string, string>;
    let topic: string;
    if (body.scope === "restaurant") {
      const session = await requireRestaurantUser();
      const limit = await checkSharedRateLimit(`realtime-token:user:${session.userId}`, 60, 5 * 60_000);
      if (!limit.allowed) return Response.json({ error: "Too many realtime reconnects" }, { status: 429 });
      claims = { restaurant_id: session.restaurantId };
      topic = `restaurant:${session.restaurantId}`;
    } else {
      const table = await db.table.findFirst({
        where: { qrToken: body.qrToken, deletedAt: null, restaurant: { slug: body.slug, isActive: true } },
        select: { id: true, restaurantId: true },
      });
      if (!table) return Response.json({ error: "Invalid table" }, { status: 404 });
      const limit = await checkSharedRateLimit(`realtime-token:table:${table.id}`, 180, 5 * 60_000);
      if (!limit.allowed) return Response.json({ error: "Too many realtime reconnects" }, { status: 429 });
      claims = { restaurant_id: table.restaurantId, table_id: table.id };
      topic = `table:${table.restaurantId}:${table.id}`;
    }

    const token = await new SignJWT({ ...claims, role: "authenticated" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(randomUUID())
      .setIssuer(`${supabaseUrl.replace(/\/$/, "")}/auth/v1`)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode(jwtSecret));

    return Response.json({ url: supabaseUrl, anonKey, token, topic }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
