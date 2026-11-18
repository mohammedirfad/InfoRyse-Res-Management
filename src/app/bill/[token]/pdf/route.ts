import { db } from "@/lib/db";
import { createBillPdf } from "@/lib/billPdf";
import { getPublicAppUrl } from "@/lib/appUrl";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function billPdfError(message: string, status: number, details?: { id: string; stage: string }) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(details ? { "X-Bill-Pdf-Error-Id": details.id, "X-Bill-Pdf-Stage": details.stage } : {}),
    },
  });
}

function pdfResponse(pdf: Buffer, billNumber: number) {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bill-${billNumber}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function parsePdfBill(value: unknown, token: string) {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const restaurant = body.restaurant as Record<string, unknown> | null;
  const numberFields = ["billNumber", "subtotalCents", "discountCents", "discountPercent", "taxCents", "taxPercent", "packingCents", "totalCents"];
  if (numberFields.some((key) => typeof body[key] !== "number" || !Number.isFinite(body[key]))) return null;
  if (typeof body.itemsJson !== "string" || body.itemsJson.length > 100_000) return null;
  let items: unknown;
  try { items = JSON.parse(body.itemsJson); } catch { return null; }
  if (!Array.isArray(items) || items.length > 500 || items.some((item) =>
    !item || typeof item !== "object" || typeof (item as Record<string, unknown>).name !== "string" ||
    (item as Record<string, unknown>).name!.toString().length > 300 ||
    ["quantity", "unitPrice", "subtotal"].some((key) => typeof (item as Record<string, unknown>)[key] !== "number" || !Number.isFinite((item as Record<string, unknown>)[key]))
  )) return null;
  if (body.shareToken !== token || !restaurant || typeof restaurant.name !== "string") return null;
  if (typeof body.tableLabel !== "string" || typeof body.paymentMethod !== "string" || typeof body.paymentStatus !== "string" || typeof body.taxName !== "string") return null;
  if (restaurant.name.length > 200 || body.tableLabel.length > 100 || body.paymentMethod.length > 60 || body.paymentStatus.length > 60 || body.taxName.length > 80) return null;
  const createdAt = new Date(String(body.createdAt ?? ""));
  const paidAt = body.paidAt ? new Date(String(body.paidAt)) : null;
  if (!Number.isFinite(createdAt.getTime()) || (paidAt && !Number.isFinite(paidAt.getTime()))) return null;
  const nullableString = (field: unknown) => typeof field === "string" ? field : null;
  return {
    billNumber: body.billNumber as number,
    tableLabel: body.tableLabel,
    customerName: nullableString(body.customerName),
    customerPhone: nullableString(body.customerPhone),
    subtotalCents: body.subtotalCents as number,
    discountCents: body.discountCents as number,
    discountPercent: body.discountPercent as number,
    discountName: nullableString(body.discountName),
    taxCents: body.taxCents as number,
    taxPercent: body.taxPercent as number,
    taxName: body.taxName,
    taxBreakdown: Array.isArray(body.taxBreakdown)
      ? body.taxBreakdown.filter((line): line is { name: string; percent: number; amountCents: number } => Boolean(
          line && typeof line === "object" && typeof (line as Record<string, unknown>).name === "string" &&
          typeof (line as Record<string, unknown>).percent === "number" && Number.isFinite((line as Record<string, unknown>).percent) &&
          typeof (line as Record<string, unknown>).amountCents === "number" && Number.isFinite((line as Record<string, unknown>).amountCents),
        ))
      : null,
    packingCents: body.packingCents as number,
    totalCents: body.totalCents as number,
    paymentMethod: body.paymentMethod,
    paymentStatus: body.paymentStatus,
    createdAt,
    paidAt,
    itemsJson: body.itemsJson,
    shareToken: token,
    restaurant: {
      name: restaurant.name,
      contactPhone: nullableString(restaurant.contactPhone),
      location: nullableString(restaurant.location),
      upiPaymentId: nullableString(restaurant.upiPaymentId),
    },
  };
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
    return pdfResponse(pdf, bill.billNumber);
  } catch (error) {
    const errorId = randomUUID();
    console.error(`[bill:pdf:${errorId}] Failed during ${stage}`, error);
    return billPdfError("Unable to generate this bill PDF. Please retry or use Print / Save as PDF.", 500, { id: errorId, stage });
  }
}

// The bill page already loaded this public bill data. Accepting it here avoids
// making a second Supabase connection just to render the downloadable copy.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  let stage = "bill payload validation";
  try {
    const payload = await req.json();
    const bill = parsePdfBill(payload, params.token);
    if (!bill) return billPdfError("Bill data is invalid. Reload the bill and try again.", 400);
    stage = "PDF rendering";
    const billUrl = `${getPublicAppUrl(req.url)}/bill/${params.token}`;
    const pdf = await createBillPdf(bill, billUrl);
    return pdfResponse(pdf, bill.billNumber);
  } catch (error) {
    const errorId = randomUUID();
    console.error(`[bill:pdf:${errorId}] Failed during ${stage}`, error);
    return billPdfError("Unable to generate this bill PDF. Please use Print / Save as PDF.", 500, { id: errorId, stage });
  }
}
