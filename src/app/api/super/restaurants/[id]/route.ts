import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";
import { invalidatePublicMenu } from "@/lib/publicMenuCache";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  ownerName: z.string().trim().min(2).optional(),
  contactEmail: z.string().trim().email().optional(),
  contactPhone: z.string().trim().max(20).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  plan: z.string().trim().max(50).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const body = UpdateSchema.parse(await req.json());

    const updated = await db.$transaction(async (tx) => {
      const r = await tx.restaurant.update({
        where: { id: params.id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(body.ownerName !== undefined ? { ownerName: body.ownerName } : {}),
          ...(body.contactEmail !== undefined ? { contactEmail: body.contactEmail } : {}),
          ...(body.contactPhone !== undefined ? { contactPhone: body.contactPhone } : {}),
          ...(body.location !== undefined ? { location: body.location } : {}),
          ...(body.plan !== undefined ? { plan: body.plan } : {}),
        },
      });

      // Update primary owner user details if email or name changed
      if (body.contactEmail || body.ownerName || body.contactPhone) {
        const ownerUser = await tx.user.findFirst({
          where: { restaurantId: params.id, role: "OWNER" },
        });
        if (ownerUser) {
          await tx.user.update({
            where: { id: ownerUser.id },
            data: {
              ...(body.contactEmail ? { email: body.contactEmail } : {}),
              ...(body.ownerName ? { name: body.ownerName } : {}),
              ...(body.contactPhone ? { phone: body.contactPhone } : {}),
            },
          });
        }
      }

      return r;
    });
    invalidatePublicMenu(updated.id);

    return Response.json({ restaurant: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.errors[0]?.message || "Invalid input" }, { status: 400 });
    }
    return tenantErrorResponse(err);
  }
}
