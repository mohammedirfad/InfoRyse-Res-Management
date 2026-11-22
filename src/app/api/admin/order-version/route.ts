import { db } from "@/lib/db";
import { requireFastRestaurantUser, tenantErrorResponse } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/** Tiny tenant-scoped change token used to recover updates missed by realtime. */
export async function GET() {
  try {
    const { restaurantId } = await requireFastRestaurantUser();
    const [latestOrder, latestServiceRequest, latestBill] = await Promise.all([
      db.order.findFirst({ where: { restaurantId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      db.serviceRequest.findFirst({ where: { restaurantId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      db.bill.findFirst({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true, paymentStatus: true, paidAt: true, totalCents: true, shareToken: true },
      }),
    ]);
    return Response.json(
      { version: [
        latestOrder?.updatedAt.toISOString() ?? "-",
        latestServiceRequest?.updatedAt.toISOString() ?? "-",
        latestBill ? [latestBill.id, latestBill.createdAt.toISOString(), latestBill.paymentStatus, latestBill.paidAt?.toISOString() ?? "-", latestBill.totalCents, Boolean(latestBill.shareToken)].join("/") : "-",
      ].join(":") },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
