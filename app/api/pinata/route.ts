import { NextRequest, NextResponse } from "next/server";

// Server-side Pinata upload proxy.
// The browser POSTs multipart FormData here (same-origin → no CORS), and this
// route forwards it to Pinata with the JWT held on the server. This fixes two
// problems with uploading straight from the browser:
//   1. Pinata's error responses lack CORS headers, so a 401/413 shows up in the
//      browser as an opaque "Failed to fetch" instead of the real status.
//   2. A NEXT_PUBLIC_ JWT ships to every visitor's browser.
//
// Set PINATA_JWT (server-only) in the environment. Falls back to the existing
// NEXT_PUBLIC_PINATA_JWT_* vars so it works without reconfiguring anything.

export const runtime = "nodejs";

const PINATA_V3_UPLOAD = "https://uploads.pinata.cloud/v3/files";

function getJwt(): string | null {
  const raw =
    process.env.PINATA_JWT ||
    process.env.NEXT_PUBLIC_PINATA_JWT_1 ||
    process.env.NEXT_PUBLIC_PINATA_JWT_2 ||
    process.env.NEXT_PUBLIC_PINATA_JWT_3 ||
    "";
  // Trim to defend against a trailing newline/space picked up when the long
  // token is pasted into a dashboard — that alone yields a 401.
  const jwt = raw.trim();
  return jwt.length ? jwt : null;
}

export async function POST(req: NextRequest) {
  const jwt = getJwt();
  if (!jwt) {
    return NextResponse.json(
      { error: "No Pinata JWT configured on the server. Set PINATA_JWT." },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(PINATA_V3_UPLOAD, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to reach Pinata: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  // Pass Pinata's body + status straight through. Because this response is
  // same-origin, the browser can always read it — no CORS masking.
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  });
}
