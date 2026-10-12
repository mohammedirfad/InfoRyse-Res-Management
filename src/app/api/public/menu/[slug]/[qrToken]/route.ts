import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; qrToken: string } }
) {
  try {
    const restaurant = await db.restaurant.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true, isActive: true, openNow: true, taxName: true, taxPercent: true, logoUrl: true },
    });

    if (!restaurant || !restaurant.isActive) {
      return Response.json(
        { error: "Restaurant not found or currently unavailable" },
        { status: 404 }
      );
    }

    const table = await db.table.findFirst({
      where: { qrToken: params.qrToken, restaurantId: restaurant.id, deletedAt: null },
      select: { id: true, label: true, status: true },
    });

    if (!table) {
      return Response.json(
        { error: "This QR code is no longer valid. Please ask staff for a new one." },
        { status: 404 }
      );
    }

    const categories = await db.category.findMany({
      where: { restaurantId: restaurant.id, isActive: true, deletedAt: null },
      orderBy: { position: "asc" },
      include: {
        menuItems: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            priceCents: true,
            imageUrl: true,
            isVeg: true,
            isAvailable: true,
          },
        },
      },
    });

    return Response.json({
      restaurant: {
        name:       restaurant.name,
        openNow:    restaurant.openNow,
        logoUrl:    restaurant.logoUrl ?? null,
        taxName:    restaurant.taxName    ?? "GST",
        taxPercent: restaurant.taxPercent ?? 5,
      },
      table: { label: table.label, status: table.status },
      categories,
    });
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
