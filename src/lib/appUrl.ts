/** Resolve the public site origin safely in local, preview, and production deployments. */
export function getPublicAppUrl(requestUrl?: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const isVercel = Boolean(process.env.VERCEL);
  const configuredIsLocal = configured ? /localhost|127\.0\.0\.1/.test(configured) : false;
  if (configured && !(isVercel && configuredIsLocal)) return configured;

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (isVercel && vercelDomain) return `https://${vercelDomain.replace(/^https?:\/\//, "")}`;
  if (requestUrl) return new URL(requestUrl).origin;
  return "http://localhost:3000";
}
