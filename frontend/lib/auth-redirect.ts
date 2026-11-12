/** Only same-origin, absolute paths are allowed as post-login destinations (prevents open redirects). */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(value)) return fallback;
  if (value === "/login" || value.startsWith("/login?") || value.startsWith("/auth/")) return fallback;
  return value;
}
