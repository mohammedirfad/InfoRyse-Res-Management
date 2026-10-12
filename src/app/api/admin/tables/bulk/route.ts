import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { generateQrToken, generateQrPngDataUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

/**
 * Answers "how many QR codes do we generate?" — exactly ONE per table, and
 * tables are created in whatever quantity the restaurant admin asks for here.
 * Example: { count: 20, section: "Indoor", labelPrefix: "T" } creates
 * T1..T20, each with its own unique, immutable qrToken and its own QR image.
 * Calling this again later with more tables only ADDS new ones — it never
 * regenerates existing tables' tokens (use the single-table regenerate
 * endpoint for that).
 */
const BodySchema = z.object({
  count: z.number().int().min(1).max(200),
  section: z.string().max(60).optional(),
  labelPrefix: z.string().max(10).default("T"),
  startIndex: z.number().int().min(1).default(1),
  capacity: z.number().int().min(1).max(50).optional(),
});

export async function POST(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const body = BodySchema.parse(await req.json());

    const slugRow = await db.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: { slug: true },
    });

    const toCreate = Array.from({ length: body.count }, (_, i) => {
      const index = body.startIndex + i;
      return {
        restaurantId,
        label: `${body.labelPrefix}${index}`,
        section: body.section,
        capacity: body.capacity,
        qrToken: generateQrToken(),
      };
    });

    // Single insert — if anything fails, no partial batch of tables is left behind.
    await db.table.createMany({ data: toCreate });

    const created = await db.table.findMany({
      where: { restaurantId, label: { in: toCreate.map((t) => t.label) } },
      orderBy: { label: "asc" },
    });

    const withQr = await Promise.all(
      created.map(async (t) => ({
        id: t.id,
        label: t.label,
        section: t.section,
        qrToken: t.qrToken,
        qrPngDataUrl: await generateQrPngDataUrl(slugRow.slug, t.qrToken),
      }))
    );

    return Response.json({ tables: withQr }, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
