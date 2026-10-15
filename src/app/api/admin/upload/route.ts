import { NextResponse } from "next/server";
import { requireRestaurantUser, tenantErrorResponse } from "@/lib/tenant";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png":  ".png",
  "image/webp": ".webp",
  "image/gif":  ".gif",
  "image/avif": ".avif",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  try {
    const { restaurantId } = await requireRestaurantUser();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid image format. Allowed formats: JPG, PNG, WEBP, GIF, AVIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image file too large. Maximum size allowed is 5 MB." },
        { status: 400 }
      );
    }

    // Prepare upload directory: <cwd>/public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate safe, unique filename
    const ext = EXTENSION_MAP[file.type] || ".jpg";
    const randomHex = crypto.randomBytes(8).toString("hex");
    const filename = `dish_${restaurantId.slice(0, 8)}_${Date.now()}_${randomHex}${ext}`;
    const destinationPath = path.join(uploadDir, filename);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(destinationPath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      publicUrl,
      url: publicUrl,
    });
  } catch (err) {
    console.error("[upload:error]", err);
    return tenantErrorResponse(err);
  }
}
