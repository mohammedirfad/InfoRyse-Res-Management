const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const keyFor = (qrToken: string) => `inforyse_table_session_${qrToken}`;

export function getGuestTableSession(qrToken: string): string | null {
  try {
    const raw = localStorage.getItem(keyFor(qrToken));
    if (!raw) return null;
    const entry = JSON.parse(raw) as { id?: string; expiresAt?: number };
    if (!entry.id || !entry.expiresAt || entry.expiresAt <= Date.now()) {
      localStorage.removeItem(keyFor(qrToken));
      return null;
    }
    return entry.id;
  } catch { return null; }
}

export function saveGuestTableSession(qrToken: string, sessionId: string) {
  try {
    localStorage.setItem(keyFor(qrToken), JSON.stringify({ id: sessionId, expiresAt: Date.now() + SESSION_TTL_MS }));
  } catch { /* The QR page remains functional when browser storage is unavailable. */ }
}

export function clearGuestTableSession(qrToken: string) {
  try { localStorage.removeItem(keyFor(qrToken)); } catch { /* Ignore unavailable storage. */ }
}
