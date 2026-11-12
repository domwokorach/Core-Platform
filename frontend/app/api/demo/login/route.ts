import { NextResponse } from "next/server";
import { DEMO_COOKIE, DEMO_USER, cookieOptions, clearFailures, createSessionValue, credentialsMatch, isDemoAuthEnabled, isThrottled, recordFailure, sameOrigin } from "@/lib/server/demo-auth";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  if (!isDemoAuthEnabled()) return new NextResponse(null, { status: 404 });
  if (!sameOrigin(req)) return NextResponse.json({ message: "Request refused." }, { status: 403, headers: noStore });
  const client = req.headers.get("x-forwarded-for") ?? "local";
  if (isThrottled(client)) return NextResponse.json({ message: "Too many attempts. Please wait a few minutes and try again." }, { status: 429, headers: noStore });
  const body = await req.json().catch(() => ({})) as { email?: unknown; password?: unknown };
  if (!credentialsMatch(body.email, body.password)) {
    recordFailure(client);
    return NextResponse.json({ message: "Incorrect email address or password." }, { status: 401, headers: noStore });
  }
  clearFailures(client);
  const res = NextResponse.json({ ok: true, name: DEMO_USER.name }, { headers: noStore });
  res.cookies.set(DEMO_COOKIE, createSessionValue(), cookieOptions);
  return res;
}
