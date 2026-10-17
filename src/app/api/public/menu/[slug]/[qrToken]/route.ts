import { db } from "@/lib/db";
import { getPublicMenuCategories } from "@/lib/publicMenuCache";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; qrToken: string } }
) {
  try {
    const table = await db.table.findFirst({
      where: {
        qrToken: params.qrToken,
        deletedAt: null,
        restaurant: { slug: params.slug },
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

    if (!table) {
      return Response.json(
        { error: "This QR code is no longer valid. Please ask staff for a new one." },
        { status: 404 }
      );
    }
    const restaurant = table.restaurant;
    if (!restaurant.isActive) {
      return Response.json(
        { error: "Restaurant not found or currently unavailable" },
        { status: 404 }
      );
    }

    const [activeSession, categories] = await Promise.all([
      db.tableSession.findFirst({
        where:   { tableId: table.id, restaurantId: restaurant.id, status: "OPEN" },
        select:  { id: true },
        orderBy: { createdAt: "desc" },
      }),
      getPublicMenuCategories(restaurant.id),
    ]);

    return new Response(
      JSON.stringify({
        restaurant: {
          name:            restaurant.name,
          openNow:         restaurant.openNow,
          logoUrl:         restaurant.logoUrl ?? null,
          taxName:         restaurant.taxName    ?? "GST",
          taxPercent:      restaurant.taxPercent ?? 5,
          discountActive:  restaurant.discountActive ?? false,
          discountPercent: restaurant.discountPercent ?? 0,
          discountName:    restaurant.discountName ?? "Special Offer",
        },
        table: {
          id:              table.id,
          label:           table.label,
          status:          table.status,
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
      }
    );
  } catch (err) {
    // Log server-side but never expose internals to the customer
    console.error("[menu:get]", err);

    // Detect connection errors specifically so the UI can show a helpful message
    const msg = String(err);
    if (msg.includes("Can't reach database") || msg.includes("ECONNREFUSED") || msg.includes("connect ETIMEDOUT")) {
      return Response.json(
        { error: "Service temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }

    return Response.json(
      { error: "Unable to load menu. Please try again." },
      { status: 500 }
    );
  }
}
