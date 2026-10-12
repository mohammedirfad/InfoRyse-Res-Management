import { nanoid } from "nanoid";
import QRCode from "qrcode";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.inforyse.com";

/** One of these per table. Random, immutable, never guessable, decoupled from table label. */
export function generateQrToken() {
  return nanoid(21);
}

export function buildCustomerMenuUrl(slug: string, qrToken: string) {
  // Route is /r/[slug]/[qrToken] — no /t/ segment
  return `${BASE_URL}/r/${slug}/${qrToken}`;
}

/** Returns a PNG data URL, ready to <img src=...> or embed in a printable sheet. */
export async function generateQrPngDataUrl(slug: string, qrToken: string) {
  const url = buildCustomerMenuUrl(slug, qrToken);
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 512 });
}

/** SVG string version — better for crisp print output. */
export async function generateQrSvg(slug: string, qrToken: string) {
  const url = buildCustomerMenuUrl(slug, qrToken);
  return QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2 });
}
