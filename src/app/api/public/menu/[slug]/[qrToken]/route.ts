import { db } from "@/lib/db";
import { getPublicMenuCategories } from "@/lib/publicMenuCache";
import { getCurrentTableSession } from "@/lib/tableSessions";

export const dynamic = "force-dynamic";

/**
 * The menu page is opened every time a guest scans the QR, and also on every
 * re-entry/back-navigation. The QR → table resolution never changes for a
 * given token, so it is memoised for a minute instead of costing a pooler
 * round-trip on every load.
 */
type QrTable = {
  id: string;
  label: string;
  status: string;
  restaurant: {
    id: string;
    isActive: boolean;
    name: string;
    openNow: boolean;
    taxName: string | null;
    taxPercent: number | null;
    logoUrl: string | null;
    discountActive: boolean | null;
    discountPercent: number | null;
    discountName: string | null;
  };
};

const qrTableCache = new Map<
  string,
  { table: QrTable | null; expiresAt: number }
>();
const QR_TABLE_TTL_MS = 60_000;

async function resolveQrTable(
  slug: string,
  qrToken: string,
): Promise<QrTable | null> {
  const key = `${slug}:${qrToken}`;
  const cached = qrTableCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.table;

  const table = await db.table.findFirst({
    where: {
      qrToken,
      deletedAt: null,
      restaurant: { slug },
    },
    select: {
      id: true,
      label: true,
      status: true,
      restaurant: {
        select: {
          id: true,
          isActive: true,
          name: true,
          openNow: true,
          taxName: true,
          taxPercent: true,
          logoUrl: true,
          discountActive: true,
          discountPercent: true,
          discountName: true,
        },
      },
    },
  });

  if (qrTableCache.size > 2000) qrTableCache.clear();
  qrTableCache.set(key, { table, expiresAt: now + QR_TABLE_TTL_MS });
  return table;
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; qrToken: string } },
) {
  try {
    const table = await resolveQrTable(params.slug, params.qrToken);

    if (!table) {
      return Response.json(
        {
          error:
            "This QR code is no longer valid. Please ask staff for a new one.",
        },
        { status: 404 },
      );
    }
    const restaurant = table.restaurant;
    if (!restaurant.isActive) {
      return Response.json(
        { error: "Restaurant not found or currently unavailable" },
        { status: 404 },
      );
    }

    const [activeSession, categories] = await Promise.all([
      getCurrentTableSession(db, table.id, restaurant.id),
      getPublicMenuCategories(restaurant.id),
    ]);

    return new Response(
      JSON.stringify({
        restaurant: {
          name: restaurant.name,
          openNow: restaurant.openNow,
          logoUrl: restaurant.logoUrl ?? null,
          taxName: restaurant.taxName ?? "GST",
          taxPercent: restaurant.taxPercent ?? 5,
          discountActive: restaurant.discountActive ?? false,
          discountPercent: restaurant.discountPercent ?? 0,
          discountName: restaurant.discountName ?? "Special Offer",
        },
        table: {
          id: table.id,
          label: table.label,
          status: table.status,
          activeSessionId: activeSession?.id ?? null,
        },
        categories,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          // The response contains table/session state. Only the catalog is cached
          // internally, shared across a restaurant's QR codes.
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (err) {
    // Log server-side but never expose internals to the customer
    console.error("[menu:get]", err);

    // Detect connection errors specifically so the UI can show a helpful message
    const msg = String(err);
    if (
      msg.includes("Can't reach database") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("connect ETIMEDOUT")
    ) {
      return Response.json(
        {
          error:
            "Service temporarily unavailable. Please try again in a moment.",
        },
        { status: 503 },
      );
    }

    return Response.json(
      { error: "Unable to load menu. Please try again." },
      { status: 500 },
    );
  }
}
