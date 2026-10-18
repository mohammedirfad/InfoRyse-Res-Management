import "server-only";

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const IMAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "restaurant-images";

export class StorageConfigurationError extends Error {
  constructor() {
    super("Image storage is not configured. Set the Supabase Storage server credentials.");
    this.name = "StorageConfigurationError";
  }
}

function assertStorageConfiguration() {
  const isExample = (value: string) =>
    !value || /your_|placeholder|xxxxxxxx|<.*>/i.test(value);

  if (
    !/^https:\/\//i.test(SUPABASE_URL) ||
    isExample(SUPABASE_URL) ||
    isExample(SERVICE_KEY) ||
    isExample(IMAGE_BUCKET)
  ) {
    throw new StorageConfigurationError();
  }
}

/** Create a short-lived, single-object upload URL without exposing the service key. */
export async function createSignedImageUpload(
  key: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  assertStorageConfiguration();

  const encodedBucket = encodeURIComponent(IMAGE_BUCKET);
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/upload/sign/${encodedBucket}/${encodedKey}`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    // Avoid returning provider response bodies, which can contain implementation details.
    throw new Error(`Supabase Storage could not create an upload URL (${response.status}).`);
  }

  const result = (await response.json()) as { url?: string; token?: string };
  if (!result.url || !result.token) {
    throw new Error("Supabase Storage returned an invalid upload URL response.");
  }

  const uploadUrl = /^https:\/\//i.test(result.url)
    ? new URL(result.url)
    : new URL(
        `${SUPABASE_URL}/storage/v1${result.url.startsWith("/") ? result.url : `/${result.url}`}`
      );
  if (!uploadUrl.searchParams.has("token")) {
    uploadUrl.searchParams.set("token", result.token);
  }
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${encodedBucket}/${encodedKey}`;

  return { uploadUrl: uploadUrl.toString(), publicUrl };
}
