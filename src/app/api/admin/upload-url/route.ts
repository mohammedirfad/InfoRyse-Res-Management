import { z } from "zod";
import { randomUUID } from "crypto";
import { getPresignedUploadUrl } from "@/lib/r2";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const BodySchema = z.object({
  contentType: z.string(),
  // "folder" lets callers organise: "menu-items", "restaurant-logos", "covers"
  folder: z.enum(["menu-items", "restaurant-logos", "covers", "staff"]).default("menu-items"),
});

/**
 * POST /api/admin/upload-url
 * Returns a presigned R2 URL the browser can PUT an image to directly.
 * Scoped to the requesting restaurant so images are namespaced per tenant.
 */
export async function POST(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();
    const { contentType, folder } = BodySchema.parse(await req.json());

    const ext = ALLOWED_TYPES[contentType];
    if (!ext) {
      return Response.json(
        { error: "Unsupported file type. Use JPEG, PNG, WebP or GIF." },
        { status: 400 }
      );
    }

    // Key: restaurants/{restaurantId}/menu-items/{uuid}.jpg
    // Namespaced per restaurant — no cross-tenant access possible
    const key = `restaurants/${restaurantId}/${folder}/${randomUUID()}.${ext}`;

    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
      key,
      contentType,
      MAX_SIZE_BYTES
    );

    return Response.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
