import { isDemoAuthEnabled } from "@/lib/server/demo-auth";

/**
 * Fictional development customer from the local Keycloak realm (infra/keycloak/finix-realm.json). Returned only when demo auth is
 * enabled (NODE_ENV=development + FINIX_DEMO_AUTH=true), so the values are never serialised into a production or staging page.
 */
export function getDevAccount(): { username: string; password: string } | null {
  return isDemoAuthEnabled() ? { username: "alex", password: "DemoPass123!" } : null;
}
