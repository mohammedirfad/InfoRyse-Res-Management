const apiUrl = (process.env.SUPABASE_URL ?? "").trim();
const databaseUrl = (process.env.DATABASE_URL ?? "").trim();
const serviceKey = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

function apiProjectRef() {
  try {
    const host = new URL(apiUrl).hostname;
    return host.endsWith(".supabase.co") ? host.slice(0, -".supabase.co".length) : "";
  } catch {
    return "";
  }
}

function databaseProjectRef() {
  try {
    const username = decodeURIComponent(new URL(databaseUrl).username);
    return username.match(/^postgres\.([a-z0-9]+)$/i)?.[1] ?? "";
  } catch {
    return "";
  }
}

function serviceKeyProjectRef() {
  const parts = serviceKey.split(".");
  if (parts.length !== 3) return ""; // New opaque sb_secret keys carry no locally readable project claim.
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload.ref === "string" ? payload.ref : "";
  } catch {
    return "";
  }
}

const apiRef = apiProjectRef();
const databaseRef = databaseProjectRef();
const serviceRef = serviceKeyProjectRef();
const mismatches = Boolean(
  (apiRef && databaseRef && apiRef !== databaseRef) ||
  (apiRef && serviceRef && apiRef !== serviceRef)
);

if (mismatches && process.env.NODE_ENV !== "production") {
  // Never include project identifiers or credential material in logs.
  console.error("[supabase:config] SUPABASE_URL, service key, and DATABASE_URL must belong to the same Supabase project.");
}

export function isSupabaseProjectConfigConsistent() {
  return !mismatches;
}
