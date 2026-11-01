"use client";

import {
  guestSessionQuery,
  readGuestDeviceId as readGuestDeviceIdFromStore,
  readStoredBillLink,
  saveGuestTableSession,
  saveStoredBillLink,
  type StoredBillLink,
} from "@/lib/guestTableSession";

/**
 * The single guest-side "bring me my bill" surface, shared by the menu screen,
 * the table tab and the order confirmation screen so all three behave
 * identically.
 *
 * The only entry point is `useTableBill()`. Everything this module needs from
 * the storage/session layer is imported here and re-exposed through that hook,
 * so no page has to reach into `@/lib/guestTableSession` for bill state. That
 * matters in production builds: pages importing several symbols from the same
 * client module occasionally resolved to a chunk that only carried part of the
 * module's exports (`readStoredBillLink is not a function` after placing an
 * order). Keeping the surface small removes that whole class of failure.
 */

export type BillStage = "idle" | "sending" | "waiting" | "ready" | "error";

export type BillSnapshot = {
  tableId: string;
  tableLabel: string;
  tableSessionId: string | null;
  requestedAt: string | null;
  billToken: string | null;
  billNumber: number | null;
  paymentStatus: string | null;
};

export type BillRequestResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; error: string };

export async function requestTableBill(params: {
  slug: string;
  qrToken: string;
  /** Only used for the UI label; the server always uses the real table label. */
  tableLabel?: string;
}): Promise<BillRequestResult> {
  const { slug, qrToken } = params;
  try {
    const response = await fetch("/api/public/assistance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        qrToken,
        tableLabel: params.tableLabel,
        requests: ["pay_bill"],
        deviceId: readGuestDeviceId(qrToken) || undefined,
      }),
    });
    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      duplicate?: boolean;
      error?: string;
      tableSessionId?: string | null;
    } | null;
    if (!response.ok) {
      return {
        ok: false,
        error: result?.error ?? "Could not notify the staff. Please try again.",
      };
    }
    if (result?.tableSessionId)
      saveGuestTableSession(qrToken, result.tableSessionId);
    return { ok: true, duplicate: Boolean(result?.duplicate) };
  } catch {
    return {
      ok: false,
      error: "Network error — please check your connection and try again.",
    };
  }
}

/**
 * Snapshot reader for the table tab. Uses `guestSessionQuery()` so the backend
 * re-attaches this device to its open tab after a reload or a QR rescan.
 */
export async function fetchBillSnapshot(
  slug: string,
  qrToken: string,
): Promise<BillSnapshot | null> {
  try {
    const response = await fetch(
      `/api/public/bill-status?slug=${encodeURIComponent(slug)}&qrToken=${encodeURIComponent(qrToken)}${guestSessionQuery(qrToken)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as BillSnapshot;
  } catch {
    return null;
  }
}

/** Persist the delivered bill link for this QR (survives reloads/rescans). */
export function rememberBillLink(qrToken: string, link: StoredBillLink) {
  saveStoredBillLink(qrToken, link);
}

/** The bill link this device already received for the current table tab. */
export function recallBillLink(qrToken: string): StoredBillLink | null {
  try {
    return readStoredBillLink(qrToken);
  } catch {
    return null;
  }
}

/** This browser's stable id for the table tab ('' when storage is blocked). */
export function readGuestDeviceId(qrToken: string): string {
  try {
    return readGuestDeviceIdFromStore(qrToken);
  } catch {
    return "";
  }
}

/** Human copy reused by every screen that shows the bill button. */
export function billButtonLabel(stage: BillStage, hasBill: boolean) {
  if (hasBill) return "View my bill";
  switch (stage) {
    case "sending":
      return "Sending…";
    case "waiting":
      return "Bill requested — waiting";
    case "error":
      return "Retry bill request";
    default:
      return "Request bill";
  }
}

export function billStatusMessage(stage: BillStage, hasBill: boolean) {
  if (hasBill)
    return "Your bill is ready. Show it at the counter or download it.";
  switch (stage) {
    case "waiting":
      return "Staff have been notified. Your bill will appear here the moment it is generated.";
    case "error":
      return "We could not reach the staff. Please tap again or call a waiter.";
    default:
      return "Tap once — the staff receive your request instantly and your bill appears here.";
  }
}

/* ── Table-tab snapshot ──────────────────────────────────────────────────────
 * Kept in this module (not inline in the page) so the guest screens only ever
 * import ONE client module for the whole bill/tab surface. Fewer import sites
 * across a chunk boundary means a stale or partially-hydrated chunk can no
 * longer surface as "someThing is not a function" at click time.
 */

export type TableTabItem = { name: string; price: number; quantity: number };

export type TableTabOrder = {
  id: string;
  orderNumber: number;
  customerName: string;
  status: string;
  createdAt: string;
  subtotalCents: number;
  items: TableTabItem[];
};

export type TableTabPayload = {
  table: { id: string; label: string; status: string };
  session: {
    id: string;
    status: string;
    createdAt: string;
    billRequestedAt?: string | null;
    orderCount: number;
    orders: TableTabOrder[];
    aggregatedItems: { name: string; unitPrice: number; quantity: number; subtotal: number }[];
    subtotalCents: number;
    taxCents: number;
    packingCents: number;
    totalCents: number;
  } | null;
  bill: {
    id?: string;
    tableSessionId?: string;
    shareToken?: string | null;
    billNumber: number;
    tableLabel: string;
    customerName: string | null;
    subtotalCents: number;
    discountCents: number;
    discountPercent: number;
    discountName: string | null;
    taxCents: number;
    taxPercent: number;
    taxName: string;
    taxBreakdown?: Array<{ name: string; percent: number; amountCents: number }> | null;
    packingCents: number;
    totalCents: number;
    paymentMethod: string;
    paymentStatus: string;
    itemsJson: string;
    createdAt: string;
    restaurant: { name: string; contactPhone: string | null; contactEmail: string | null };
  } | null;
};

/** Live orders + running tab + bill for this QR, restored across reloads/rescans. */
export async function refreshTableTab(slug: string, qrToken: string): Promise<TableTabPayload | null> {
  try {
    const response = await fetch(
      `/api/public/table-orders?slug=${encodeURIComponent(slug)}&qrToken=${encodeURIComponent(qrToken)}${guestSessionQuery(qrToken)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as TableTabPayload;
    if (payload?.session?.id) saveGuestTableSession(qrToken, payload.session.id);
    return payload;
  } catch {
    return null;
  }
}
