/** Top-level application areas that may be used as post-login destinations. */
const APP_SECTIONS = ["accounts", "analytics", "cards", "goals", "investments", "notifications", "settings", "transactions", "transfers"];

/** Only same-origin, absolute paths into a known application area are allowed (prevents open redirects). */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(value)) return fallback;
  let url: URL;
  try { url = new URL(value, "http://app.invalid"); } catch { return fallback; }
  if (url.origin !== "http://app.invalid") return fallback;
  const section = url.pathname.split("/")[1] ?? "";
  if (url.pathname === "/" || url.pathname === "/dashboard") return "/";
  if (!APP_SECTIONS.includes(section)) return fallback;
  return url.pathname + url.search;
}

export function loginUrl(returnTo: string): string {
  const safe = safeRedirectPath(returnTo);
  return safe === "/" ? "/login" : `/login?returnTo=${encodeURIComponent(safe)}`;
}
