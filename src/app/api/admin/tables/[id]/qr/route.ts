import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { generateQrToken, generateQrPngDataUrl, buildCustomerMenuUrl } from "@/lib/qr";

/**
 * GET — return the current QR image for an existing table (used by QR Menu page to lazy-load).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const table = await db.table.findFirst({ where: { id: params.id, restaurantId, deletedAt: null } });
    if (!table) return Response.json({ error: "Table not found" }, { status: 404 });

    const restaurant = await db.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: { slug: true },
    });
    const qrPngDataUrl = await generateQrPngDataUrl(restaurant.slug, table.qrToken);
    const menuUrl = buildCustomerMenuUrl(restaurant.slug, table.qrToken);

    return Response.json({ qrToken: table.qrToken, qrPngDataUrl, menuUrl });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

/**
 * POST — invalidate current QR and issue a new one instantly.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await requireRestaurantUser();

    const table = await db.table.findFirst({ where: { id: params.id, restaurantId, deletedAt: null } });
    if (!table) return Response.json({ error: "Table not found" }, { status: 404 });

    const newToken = generateQrToken();
    await db.table.update({ where: { id: table.id }, data: { qrToken: newToken } });

    const restaurant = await db.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: { slug: true },
    });
    const qrPngDataUrl = await generateQrPngDataUrl(restaurant.slug, newToken);

    return Response.json({ qrToken: newToken, qrPngDataUrl });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
