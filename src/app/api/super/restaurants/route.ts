import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { sendEmail, buildOnboardingEmailHtml } from "@/lib/email";
import { generateQrToken } from "@/lib/qr";
import { getPublicAppUrl } from "@/lib/appUrl";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    const restaurants = await db.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { orders: true, tables: true } },
        users: { where: { role: "OWNER" }, select: { id: true, email: true, name: true, phone: true } },
      },
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
  name: z.string().trim().min(2, "Restaurant name must be at least 2 characters").max(100),
  ownerName: z.string().trim().min(2, "Owner name must be at least 2 characters"),
  ownerEmail: z.string().trim().email("Please provide a valid email address"),
  ownerPhone: z.string().trim().min(7, "Please provide a valid phone number").max(20).optional().or(z.literal("")),
  location: z.string().trim().min(2, "Location is required").max(120),
  plan: z.enum(["Basic", "Pro", "Premium", "Enterprise"]).default("Pro"),
});

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const body = BodySchema.parse(await req.json());

    // Validate email uniqueness
    const existingUser = await db.user.findUnique({
      where: { email: body.ownerEmail.toLowerCase() },
    });
    if (existingUser) {
      return Response.json(
        { error: `An account with email "${body.ownerEmail}" already exists. Please use a different owner email.` },
        { status: 400 }
      );
    }

    // Store only a hash of an inaccessible random password. The owner sets
    // their real password through the email OTP flow from /admin/login.
    const unissuedPassword = randomBytes(32).toString("base64url");

    const slug = await uniqueSlug(body.name);

    const restaurant = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
      const r = await tx.restaurant.create({
        data: {
          name: body.name,
          slug,
          ownerName: body.ownerName,
          contactEmail: body.ownerEmail.toLowerCase(),
          contactPhone: body.ownerPhone || null,
          location: body.location,
          plan: body.plan,
          isActive: true,
        },
      });

      const passwordHash = await hashPassword(unissuedPassword);

      await tx.user.create({
        data: {
          email: body.ownerEmail.toLowerCase(),
          name: body.ownerName,
          phone: body.ownerPhone || null,
          passwordHash,
          role: "OWNER",
          restaurantId: r.id,
          mustChangePassword: true, // Forces password change on first login!
        },
      });

      // Seed essential default categories so Menu Management is immediately functional
      const DEFAULT_CATS = ["Main Course", "Starters & Appetizers", "Beverages & Drinks", "Desserts & Sweets", "Today's Specials"];
      for (let i = 0; i < DEFAULT_CATS.length; i++) {
        await tx.category.create({
          data: {
            restaurantId: r.id,
            name: DEFAULT_CATS[i],
            position: i + 1,
            isActive: true,
          },
        });
      }

      return r;
    });

    const loginUrl = `${getPublicAppUrl(req.url)}/admin/login`;

    // Build & send high-end corporate onboarding email
    const emailHtml = buildOnboardingEmailHtml({
      restaurantName: restaurant.name,
      ownerName: body.ownerName,
      ownerEmail: body.ownerEmail.toLowerCase(),
      loginUrl,
      slug: restaurant.slug,
    });

    const emailResult = await sendEmail({
      to: body.ownerEmail.toLowerCase(),
      subject: `Welcome to InfoRyse: Administrative Access for ${restaurant.name}`,
      html: emailHtml,
      text: `Welcome ${body.ownerName}!\n\nYour restaurant "${restaurant.name}" has been created.\nRestaurant Admin URL: ${loginUrl}\nLogin email: ${body.ownerEmail}\n\nOpen the login page and select Forgot password to verify your email and set your password.`,
    });

    return Response.json(
      {
        restaurant,
        credentials: {
          email: body.ownerEmail.toLowerCase(),
          loginUrl,
          emailSent: emailResult.success,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return tenantErrorResponse(err);
  }
}
