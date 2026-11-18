export const dynamic = "force-dynamic";

function redirectToBill(req: Request, token: string, status: 302 | 303) {
  const target = new URL(`/bill/${encodeURIComponent(token)}`, req.url);
  return new Response(null, {
    status,
    headers: {
      Location: target.toString(),
      "Cache-Control": "private, no-store",
    },
  });
}

// Legacy bill-PDF URLs now return the printable bill page. PDF creation stays
// in the browser's native print/save flow so a separate DB/PDF server request
// cannot turn into a .json/.txt download.
export async function GET(req: Request, { params }: { params: { token: string } }) {
  return redirectToBill(req, params.token, 302);
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  return redirectToBill(req, params.token, 303);
}
