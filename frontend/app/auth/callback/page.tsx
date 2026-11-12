"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { getUserManager } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/auth-redirect";

// An authorization code is single-use. React StrictMode runs effects twice in development, so the
// exchange is memoised per page load: the second run reuses the first result instead of re-sending the code.
let exchange: Promise<string> | undefined;
function completeSignIn(): Promise<string> {
  exchange ??= getUserManager().signinRedirectCallback().then(user => {
    const state = user.state as { returnTo?: unknown } | undefined;
    return safeRedirectPath(state?.returnTo);
  });
  return exchange;
}

export default function CallbackPage() {
  const [error, setError] = useState<string>();
  useEffect(() => {
    // Success is only reported once the code exchange and token validation have completed.
    completeSignIn()
      .then(target => { try { sessionStorage.removeItem("finix.returnTo"); } catch { /* ignore */ } window.location.replace(target); })
      .catch(e => {
        setError("We couldn't complete sign-in.");
        const denied = (e as { error?: string })?.error === "access_denied";
        // No matching state = the sign-in attempt it belonged to is gone (expired, or another tab/restart replaced it).
        const stale = e instanceof Error && /no matching state/i.test(e.message);
        window.location.replace(`/login?error=${denied ? "denied" : stale ? "timeout" : "callback"}`);
      });
  }, []);
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-card" role={error ? "alert" : "status"}>
        <LogoMark className="mx-auto size-10" />
        <h1 className="mt-5 text-lg font-semibold">{error ? "Sign-in failed" : "Completing secure sign-in…"}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{error ? "Taking you back to sign in…" : "Validating your identity with the OIDC provider."}</p>
        {error ? null : <Loader2 className="mx-auto mt-5 size-5 animate-spin text-muted-foreground" />}
      </div>
    </main>
  );
}
