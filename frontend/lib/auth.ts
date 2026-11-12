import { UserManager, WebStorageStateStore } from "oidc-client-ts";

/** Opt-in unauthenticated sample-data mode (design review / UI tests). Off by default: banking pages require a session. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

let manager: UserManager | undefined;
let registrationManager: UserManager | undefined;

function createManager(registration: boolean): UserManager {
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || window.location.origin;
    const authority = process.env.NEXT_PUBLIC_OIDC_AUTHORITY || "http://localhost:8081/realms/finix";
    return new UserManager({
      authority,
      // Self-registration uses Keycloak's registrations endpoint (same parameters as /auth); everything else, including the
      // state/PKCE storage and the callback, is shared with sign-in.
      ...(registration ? { metadataSeed: { authorization_endpoint: `${authority}/protocol/openid-connect/registrations` } } : {}),
      client_id: process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || "finix-web",
      redirect_uri: `${origin}/auth/callback`,
      post_logout_redirect_uri: `${origin}/login?signedOut=1`,
      response_type: "code",
      scope: "openid profile email",
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
      // Refresh-token renewal (no iframe): keeps the session alive until the SSO session itself expires.
      automaticSilentRenew: !registration,
      loadUserInfo: true,
    });
}

export function getUserManager(): UserManager {
  if (typeof window === "undefined") throw new Error("OIDC login must run in the browser");
  return (manager ??= createManager(false));
}

/** Starts the same Authorization Code + PKCE flow, but on Keycloak's FINIX-themed registration page. */
export function getRegistrationManager(): UserManager {
  if (typeof window === "undefined") throw new Error("OIDC registration must run in the browser");
  return (registrationManager ??= createManager(true));
}
