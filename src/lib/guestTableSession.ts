/**
 * Guest dining-tab identity.
 *
 * The table QR token identifies the *table*, not the visit. Guests frequently
 * pull-to-refresh, switch to the camera and rescan the same QR, close the
 * tab and reopen it — in all of those cases they must land back on the same
 * open table tab (orders + bill), never on a fresh empty one.
 *
 * We therefore persist, per QR token:
 *   - the server-issued tableSessionId (survives reloads and rescans), and
 *   - a random per-device id issued by this browser, which the server uses to
 *     fold this device into the right table session even if the local storage
 *     entry is lost (private mode, QR re-scan on another browser).
 *
 * Neither value is a secret: the server always re-derives the restaurant and
 * table from the QR token, and a session is only ever returned when it belongs
 * to that table and is still OPEN.
 */

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const sessionKey = (qrToken: string) => `inforyse_table_session_${qrToken}`;
const deviceKey = (qrToken: string) => `inforyse_guest_device_${qrToken}`;

export type GuestSession = { id: string; expiresAt: number; deviceId?: string };

function randomId() {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto)
      return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function getGuestDeviceId(qrToken: string): string {
  try {
    const existing = localStorage.getItem(deviceKey(qrToken));
    if (existing) return existing;
    const created = randomId();
    localStorage.setItem(deviceKey(qrToken), created);
    return created;
  } catch {
    return "";
  }
}

/** Device id without ever writing (safe to call during render). */
export function readGuestDeviceId(qrToken: string): string {
  try {
    return localStorage.getItem(deviceKey(qrToken)) ?? "";
  } catch {
    return "";
  }
}

export function getGuestTableSession(qrToken: string): string | null {
  const entry = readGuestSession(qrToken);
  return entry?.id ?? null;
}

export function readGuestSession(qrToken: string): GuestSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(qrToken));
    if (!raw) return null;
    const entry = JSON.parse(raw) as GuestSession;
    if (!entry?.id || !entry.expiresAt || entry.expiresAt <= Date.now()) {
      localStorage.removeItem(sessionKey(qrToken));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function saveGuestTableSession(qrToken: string, sessionId: string) {
  try {
    const deviceId = getGuestDeviceId(qrToken) || undefined;
    localStorage.setItem(
      sessionKey(qrToken),
      JSON.stringify({
        id: sessionId,
        expiresAt: Date.now() + SESSION_TTL_MS,
        deviceId,
      }),
    );
  } catch {
    /* The QR page remains functional when browser storage is unavailable. */
  }
}

export function clearGuestTableSession(qrToken: string) {
  try {
    localStorage.removeItem(sessionKey(qrToken));
  } catch {
    /* Ignore unavailable storage. */
  }
}

/**
 * Query string appended to every guest API call so the server can restore the
 * right table tab even after a reload, a rescan or a lost browser store.
 */
export function guestSessionQuery(qrToken: string): string {
  const sessionId = getGuestTableSession(qrToken);
  const deviceId = getGuestDeviceId(qrToken);
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (deviceId) params.set("deviceId", deviceId);
  const query = params.toString();
  return query ? `&${query}` : "";
}

/* ── Last delivered digital bill (survives reloads; cleared when tab changes) ── */

export type StoredBillLink = { token: string; sessionId: string };

const billKey = (qrToken: string) => `digital-bill:${qrToken}`;

export function readStoredBillLink(qrToken: string): StoredBillLink | null {
  try {
    const raw = localStorage.getItem(billKey(qrToken));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBillLink;
    return parsed?.token && parsed?.sessionId ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredBillLink(qrToken: string, link: StoredBillLink) {
  try {
    localStorage.setItem(billKey(qrToken), JSON.stringify(link));
  } catch {
    /* ignore */
  }
}

export function clearStoredBillLink(qrToken: string) {
  try {
    localStorage.removeItem(billKey(qrToken));
  } catch {
    /* ignore */
  }
}
