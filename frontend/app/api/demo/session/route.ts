import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEMO_COOKIE, isDemoAuthEnabled, readSession } from "@/lib/server/demo-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDemoAuthEnabled()) return new NextResponse(null, { status: 404 });
  const session = readSession((await cookies()).get(DEMO_COOKIE)?.value);
  return session
    ? NextResponse.json(session, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ message: "No demo session." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
