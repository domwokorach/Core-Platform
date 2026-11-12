import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Development-only demo sign-in. NOT an authentication system: it never issues a token, never reaches the Spring API and only flips
 * the UI into the same fixture data used by the signed-out sample view. It exists only when BOTH hold, on the server:
 *   NODE_ENV === "development"  and  FINIX_DEMO_AUTH === "true"   (a server variable, deliberately not NEXT_PUBLIC_*)
 * A production build can never satisfy the first condition, so every demo route answers 404 there.
 */
export const DEMO_COOKIE = "finix_demo";
export const DEMO_USER = { email: "demo@gmail.com", name: "Demo User" } as const;
const SESSION_SECONDS = 2 * 60 * 60;
// Only a digest of the demo password is kept, and only in server code (this file is never bundled for the browser).
const PASSWORD_SHA256 = "dd130a849d7b29e5541b05d2f7f86a4acd4f1ec598c1c9438783f56bc4f0ff80";

export function isDemoAuthEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.FINIX_DEMO_AUTH === "true";
}

const g = globalThis as unknown as { __finixDemoSecret?: string; __finixDemoAttempts?: Map<string, { n: number; reset: number }> };
function secret(): string {
  // Per-process random key unless an explicit server secret is provided: demo cookies never survive a restart.
  return process.env.FINIX_SESSION_SECRET || (g.__finixDemoSecret ??= randomBytes(32).toString("hex"));
}
const sign = (payload: string) => createHmac("sha256", secret()).update(`finix-demo.${payload}`).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function credentialsMatch(email: unknown, password: unknown): boolean {
  if (typeof email !== "string" || typeof password !== "string" || password.length > 256 || email.length > 320) return false;
  const emailOk = safeEqual(createHash("sha256").update(email.trim().toLowerCase()).digest("hex"), createHash("sha256").update(DEMO_USER.email).digest("hex"));
  const passOk = safeEqual(createHash("sha256").update(password).digest("hex"), PASSWORD_SHA256);
  return emailOk && passOk; // both always evaluated
}

export function createSessionValue(): string {
  const payload = Buffer.from(JSON.stringify({ sub: "demo", email: DEMO_USER.email, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSession(cookie: string | undefined): { email: string; name: string } | null {
  if (!cookie || !isDemoAuthEnabled()) return null;
  const [payload, mac] = cookie.split(".");
  if (!payload || !mac || !safeEqual(mac, sign(payload))) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (body.sub !== "demo" || typeof body.exp !== "number" || body.exp < Date.now() / 1000) return null;
    return { ...DEMO_USER };
  } catch { return null; }
}

export const cookieOptions = { httpOnly: true, sameSite: "strict" as const, path: "/", maxAge: SESSION_SECONDS, secure: false };

/** Small in-memory throttle (dev only): 12 FAILED attempts per 5 minutes per client; a successful sign-in resets it. */
const MAX_FAILURES = 12;
export function isThrottled(client: string): boolean {
  const e = (g.__finixDemoAttempts ??= new Map()).get(client);
  return !!e && e.reset > Date.now() && e.n >= MAX_FAILURES;
}
export function recordFailure(client: string): void {
  const map = (g.__finixDemoAttempts ??= new Map());
  const now = Date.now(), e = map.get(client);
  if (!e || e.reset < now) map.set(client, { n: 1, reset: now + 5 * 60_000 });
  else e.n += 1;
}
export function clearFailures(client: string): void { g.__finixDemoAttempts?.delete(client); }

/** Same-origin check for state-changing requests (defence in depth on top of SameSite=Strict). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !origin || new URL(origin).host === req.headers.get("host");
}
