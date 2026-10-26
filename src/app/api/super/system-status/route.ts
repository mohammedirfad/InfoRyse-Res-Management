import { db } from "@/lib/db";
import { requireSuperAdmin, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
    await db.$queryRaw`SELECT 1`;
    const emailProvider = process.env.RESEND_API_KEY && (process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM)
      ? "Resend"
      : process.env.SMTP_USER && process.env.SMTP_PASS ? "SMTP" : null;
    return Response.json({ database: "connected", emailProvider, checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
