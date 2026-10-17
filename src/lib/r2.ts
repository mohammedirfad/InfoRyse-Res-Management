import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 is S3-compatible — we use the AWS SDK with a custom endpoint.
 * Images are stored in R2 and served from the public bucket URL (free egress).
 *
 * Flow:
 *  1. Client requests a presigned upload URL → POST /api/admin/upload-url
 *  2. Client uploads directly to R2 (no load on our server)
 *  3. Client saves the returned public URL to the DB (e.g. menuItem.imageUrl)
 */

// Validate required env vars at module load — fail loud in dev
const ACCOUNT_ID  = process.env.R2_ACCOUNT_ID      ?? "";
const ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID    ?? "";
const SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY ?? "";
const BUCKET_NAME = process.env.R2_BUCKET_NAME      ?? "inforyse-images";
const PUBLIC_URL  = (process.env.R2_PUBLIC_URL       ?? "").replace(/\/$/, "");

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "[r2] R2 environment variables not set — image upload will fail.\n" +
      "     Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY to .env"
    );
  }
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

/**
 * Generate a presigned PUT URL valid for 60 seconds.
 * The client uploads directly; our server never touches the file data.
 */
export async function getPresignedUploadUrl(
  key:         string,        // e.g. "menu-items/uuid.jpg"
  contentType: string,        // e.g. "image/jpeg"
  contentLength = 5 * 1024 * 1024
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket:        BUCKET_NAME,
    Key:           key,
    ContentType:   contentType,
    ContentLength: contentLength,
    CacheControl:  "public, max-age=31536000, immutable", // CDN cache forever
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 });
  const publicUrl = `${PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl };
}

/**
 * Delete an object from R2 (e.g. when a menu item is deleted).
 */
export async function deleteR2Object(key: string) {
  if (!key) return;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  } catch (err) {
    console.error("[r2:delete]", key, err);
  }
}

/**
 * Extract the R2 key from a public URL so we can delete it later.
 * e.g. "https://pub-xxx.r2.dev/menu-items/uuid.jpg" → "menu-items/uuid.jpg"
 */
export function keyFromUrl(url: string): string {
  if (!PUBLIC_URL || !url.startsWith(PUBLIC_URL)) return "";
  return url.slice(PUBLIC_URL.length + 1); // +1 for the "/"
}
