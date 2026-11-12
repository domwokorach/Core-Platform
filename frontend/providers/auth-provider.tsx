"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "oidc-client-ts";
import { getUserManager } from "@/lib/auth";
import { loginUrl } from "@/lib/auth-redirect";

interface AuthValue {
  /** Valid, unexpired OIDC user, or null (demo mode). */
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Clears the local session (e.g. after a 401/403) without a redirect. */
  endSession: () => void;
  /** Development-only demo session (signed server cookie, fixture data, no token). Always null in production builds. */
  demo: { email: string; name: string } | null;
  /** True once a session that existed has been terminated locally (expiry / rejected token). */
  sessionEnded: boolean;
  getToken: () => string | null;
  authError: string | null;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children, demoAvailable = false }: { children: React.ReactNode; demoAvailable?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [demo, setDemo] = useState<{ email: string; name: string } | null>(null);
  const [demoChecked, setDemoChecked] = useState(!demoAvailable);
  const ref = useRef<User | null>(null);
  ref.current = user;

  useEffect(() => {
    let canceled = false;
    getUserManager().getUser()
      .then(existing => { if (!canceled && existing && !existing.expired) setUser(existing); })
      .catch(e => { if (!canceled) setAuthError(e instanceof Error ? e.message : "Authentication unavailable"); })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, []);

  // Every system-initiated end (expiry, rejected token, failed renewal) is flagged so sign-in is not restarted automatically.
  // Only asked when the server says demo sign-in exists (development + explicit opt-in), so production never calls it.
  useEffect(() => {
    if (!demoAvailable) return;
    let canceled = false;
    fetch("/api/demo/session", { cache: "no-store", credentials: "same-origin" })
      .then(r => (r.ok ? r.json() : null))
      .then(v => { if (!canceled && v && typeof v.email === "string") setDemo(v); })
      .catch(() => undefined)
      .finally(() => { if (!canceled) setDemoChecked(true); });
    return () => { canceled = true; };
  }, [demoAvailable]);

  const endSession = useCallback(() => {
    getUserManager().removeUser().catch(() => undefined);
    setSessionEnded(true);
    setUser(null);
  }, []);

  // Refresh-token renewal replaces the user; a failed renewal means the SSO session is over.
  useEffect(() => {
    const events = getUserManager().events;
    const loaded = (u: User) => setUser(u);
    // Only a session that was live in this tab can "end". A stored user that was already expired at page load is not a
    // failure: the route guard sends the visitor through /login, where the still-valid Keycloak session signs them back in silently.
    const failed = () => { if (ref.current) endSession(); };
    events.addUserLoaded(loaded);
    events.addSilentRenewError(failed);
    events.addAccessTokenExpired(failed);
    return () => { events.removeUserLoaded(loaded); events.removeSilentRenewError(failed); events.removeAccessTokenExpired(failed); };
  }, [endSession]);

  const value = useMemo<AuthValue>(() => ({
    user, demo, loading: loading || !demoChecked, authError, endSession, sessionEnded,
    getToken: () => (ref.current && !ref.current.expired ? ref.current.access_token : null),
    // Sends the user to the FINIX sign-in screen, remembering where they were.
    signIn: async () => {
      window.location.assign(loginUrl(window.location.pathname + window.location.search));
    },
    signOut: async () => {
      if (ref.current === null && demo) {
        await fetch("/api/demo/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
        // navigate away without clearing React state first, so the route guard cannot race this redirect
        window.location.assign("/login?signedOut=1");
        return;
      }
      await getUserManager().signoutRedirect().catch(endSession);
    },
  }), [user, demo, loading, demoChecked, authError, endSession, sessionEnded]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
