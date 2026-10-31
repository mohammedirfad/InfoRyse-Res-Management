import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { invalidatePublicMenu } from "@/lib/publicMenuCache";
import { clearSession } from "@/lib/auth";
import { invalidateRestaurantActiveCache } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name:            z.string().trim().min(1).max(100).optional(),
  ownerName:       z.string().trim().max(100).optional().nullable(),
  contactEmail:    z.string().trim().email().optional().nullable(),
  contactPhone:    z.string().trim().max(25).optional().nullable(),
  location:        z.string().trim().max(200).optional().nullable(),
  logoUrl:         z.string().optional().nullable(),
  openNow:         z.boolean().optional(),
  taxName:         z.string().max(30).optional(),
  taxPercent:      z.number().min(0).max(30).optional(),
  additionalTaxes: z.array(z.object({ name: z.string().trim().min(1).max(30), percent: z.number().min(0).max(30) })).max(5).optional(),
  discountActive:  z.boolean().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountName:    z.string().max(100).optional(),
  upiPaymentId: z.string().trim().max(150).regex(/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/).or(z.literal("")).optional(),
});

const DeactivateSchema = z.object({ confirmationName: z.string().trim().min(1).max(100) });

export async function GET() {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId } });
    return Response.json({ restaurant });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { restaurantId, role } = await requireRestaurantUser();
    if (role !== "OWNER") {
      return Response.json({ error: "Access denied. Only restaurant owners can modify restaurant settings." }, { status: 403 });
    }
    const body = PatchSchema.parse(await req.json());
    const updated = await db.restaurant.update({
      where: { id: restaurantId },
      data:  body,
    });
    invalidatePublicMenu(restaurantId);
    return Response.json({ restaurant: updated });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const { restaurantId, role } = await requireRestaurantUser();
    if (role !== "OWNER") {
      return Response.json({ error: "Only the restaurant owner can deactivate this account." }, { status: 403 });
    }
    const body = DeactivateSchema.parse(await req.json());
    const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true, name: true, isActive: true } });
    if (!restaurant || !restaurant.isActive) return Response.json({ error: "This restaurant account is already inactive." }, { status: 409 });
    if (body.confirmationName.toLocaleLowerCase() !== restaurant.name.trim().toLocaleLowerCase()) {
      return Response.json({ error: "The restaurant name does not match." }, { status: 400 });
    }

    await db.restaurant.update({ where: { id: restaurantId }, data: { isActive: false, openNow: false } });
    invalidatePublicMenu(restaurantId);
    invalidateRestaurantActiveCache(restaurantId);
    clearSession();
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message || "Invalid confirmation" }, { status: 400 });
    return tenantErrorResponse(error);
  }
}
