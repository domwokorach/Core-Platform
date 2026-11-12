/**
 * Logo.dev image URLs (https://www.logo.dev/docs/logo-images/introduction).
 * `NEXT_PUBLIC_LOGO_DEV_TOKEN` must be a *publishable* key (pk_…), which Logo.dev documents as safe for client code.
 * NEVER put a secret key (sk_…) here: it would be shipped to every browser.
 *
 * Privacy: the only thing placed in the URL is a server-verified merchant domain. Transaction descriptors, amounts, account
 * data and customer identity are never sent. Images are loaded directly by the browser (not proxied), as Logo.dev's fair-use
 * policy requires, and the default referrer policy is kept because domain-restricted keys are validated against Referer.
 */
const HOSTNAME = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

export const isValidDomain = (domain: string | null | undefined): domain is string =>
  typeof domain === "string" && domain.length <= 253 && HOSTNAME.test(domain);

export const LOGO_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;

/** Returns null (→ fallback icon, no network request) when the token is missing/unsafe or the domain is not a plain hostname. */
export function logoUrl(domain: string | null | undefined, size = 128, token: string | undefined = LOGO_TOKEN): string | null {
  if (!token || token.startsWith("sk_") || !isValidDomain(domain)) return null;
  const params = new URLSearchParams({ token, size: String(size), format: "png", fallback: "404" });
  return `https://img.logo.dev/${domain}?${params.toString()}`;
}

export const logosEnabled = (token: string | undefined = LOGO_TOKEN) => Boolean(token) && !token!.startsWith("sk_");
