import { db } from "@/lib/db";
import { createBillPdf } from "@/lib/billPdf";
import { getPublicAppUrl } from "@/lib/appUrl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function billPdfError(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  let stage = "bill lookup";
  try {
    const bill = await db.bill.findUnique({
      where: { shareToken: params.token },
      include: { restaurant: { select: { name: true, contactPhone: true, location: true, upiPaymentId: true } } },
    });
    if (!bill) return billPdfError("Bill not found", 404);
    stage = "bill URL creation";
    const billUrl = `${getPublicAppUrl(_req.url)}/bill/${bill.shareToken}`;
    stage = "PDF rendering";
    const pdf = await createBillPdf(bill, billUrl);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bill-${bill.billNumber}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(`[bill:pdf] Failed during ${stage}`, error);
    return billPdfError("Unable to generate this bill PDF. Please retry or use Print / Save as PDF.", 500);
  }
}
