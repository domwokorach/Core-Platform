import { NextResponse } from "next/server";
import { DEMO_COOKIE, isDemoAuthEnabled, sameOrigin } from "@/lib/server/demo-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isDemoAuthEnabled()) return new NextResponse(null, { status: 404 });
  if (!sameOrigin(req)) return NextResponse.json({ message: "Request refused." }, { status: 403 });
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(DEMO_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
