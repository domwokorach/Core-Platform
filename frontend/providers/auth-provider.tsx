"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "oidc-client-ts";
import { getUserManager } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/auth-redirect";

interface AuthValue {
  /** Valid, unexpired OIDC user, or null (demo mode). */
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Clears the local session (e.g. after a 401/403) without a redirect. */
  endSession: () => void;
  getToken: () => string | null;
  authError: string | null;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
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

  const endSession = useCallback(() => {
    getUserManager().removeUser().catch(() => undefined);
    setUser(null);
  }, []);

  // Sign out locally the moment the access token expires.
  useEffect(() => {
    if (!user?.expires_at) return;
    const timer = setTimeout(endSession, Math.max(0, user.expires_at * 1000 - Date.now()));
    return () => clearTimeout(timer);
  }, [user, endSession]);

  const value = useMemo<AuthValue>(() => ({
    user, loading, authError, endSession,
    getToken: () => (ref.current && !ref.current.expired ? ref.current.access_token : null),
    // Sends the user to the FINIX sign-in screen, remembering where they were.
    signIn: async () => {
      const here = safeRedirectPath(window.location.pathname + window.location.search);
      window.location.assign(here === "/" ? "/login" : `/login?returnTo=${encodeURIComponent(here)}`);
    },
    signOut: async () => { await getUserManager().signoutRedirect().catch(endSession); },
  }), [user, loading, authError, endSession]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
