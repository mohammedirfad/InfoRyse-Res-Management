import { db } from "@/lib/db";
import { createBillPdf } from "@/lib/billPdf";
import { getPublicAppUrl } from "@/lib/appUrl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const bill = await db.bill.findUnique({
    where: { shareToken: params.token },
    include: { restaurant: { select: { name: true, contactPhone: true, location: true, upiPaymentId: true } } },
  });
  if (!bill) return Response.json({ error: "Bill not found" }, { status: 404 });
  const billUrl = `${getPublicAppUrl(_req.url)}/bill/${bill.shareToken}`;
  const pdf = await createBillPdf(bill, billUrl);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bill-${bill.billNumber}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
