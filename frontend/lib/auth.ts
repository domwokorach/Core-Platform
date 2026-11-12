import { UserManager, WebStorageStateStore } from "oidc-client-ts";

let manager: UserManager | undefined;

export function getUserManager(): UserManager {
  if (typeof window === "undefined") throw new Error("OIDC login must run in the browser");
  if (!manager) {
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || window.location.origin;
    manager = new UserManager({
      authority: process.env.NEXT_PUBLIC_OIDC_AUTHORITY || "http://localhost:8081/realms/finix",
      client_id: process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || "finix-web",
      redirect_uri: `${origin}/auth/callback`,
      post_logout_redirect_uri: origin,
      response_type: "code",
      scope: "openid profile email",
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
      automaticSilentRenew: false,
      loadUserInfo: true,
    });
  }
  return manager;
}
