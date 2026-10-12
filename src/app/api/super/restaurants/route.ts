import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    const restaurants = await db.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true, tables: true } } },
    });
    return Response.json({ restaurants });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

/** Guarantees a unique slug even if two restaurants share a name — no collision is possible. */
async function uniqueSlug(name: string) {
  const base = slugify(name) || "restaurant";
  let candidate = base;
  let suffix = 2;
  while (await db.restaurant.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

const BodySchema = z.object({
  name: z.string().min(1).max(100),
  ownerEmail: z.string().email(),
  ownerTempPassword: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const body = BodySchema.parse(await req.json());
    const slug = await uniqueSlug(body.name);

    const restaurant = await db.$transaction(async (tx) => {
      const r = await tx.restaurant.create({ data: { name: body.name, slug } });
      const passwordHash = await hashPassword(body.ownerTempPassword);
      await tx.user.create({
        data: { email: body.ownerEmail, passwordHash, role: "OWNER", restaurantId: r.id },
      });
      return r;
    });

    return Response.json({ restaurant }, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
