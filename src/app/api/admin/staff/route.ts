import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { restaurantId, role } = await requireRestaurantUser();
    if (role !== "OWNER") {
      return Response.json({ error: "Access denied. Only owners can access staff management." }, { status: 403 });
    }
    const staff = await db.user.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ staff });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

const CreateSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Valid email required"),
  phone: z.string().trim().optional(),
  role: z.enum(["OWNER", "STAFF"]).default("STAFF"),
  password: z.string().min(6, "Password must be at least 6 characters").default("Staff@1234"),
});

export async function POST(req: Request) {
  try {
    const { restaurantId, role } = await requireRestaurantUser();
    if (role !== "OWNER") {
      return Response.json({ error: "Access denied. Only owners can add staff." }, { status: 403 });
    }
    const body = CreateSchema.parse(await req.json());

    const existing = await db.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (existing) {
      return Response.json({ error: "A user with this email already exists." }, { status: 400 });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await db.user.create({
      data: {
        restaurantId,
        email: body.email.toLowerCase(),
        name: body.name,
        phone: body.phone || null,
        role: body.role,
        passwordHash,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return Response.json({ staff: user }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return tenantErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const { restaurantId, role } = await requireRestaurantUser();
    if (role !== "OWNER") {
      return Response.json({ error: "Access denied. Only owners can remove staff." }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "Staff ID required" }, { status: 400 });

    const target = await db.user.findFirst({ where: { id, restaurantId } });
    if (!target) return Response.json({ error: "Staff member not found" }, { status: 404 });

    await db.user.delete({ where: { id: target.id } });
    return Response.json({ ok: true });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
