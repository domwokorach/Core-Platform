"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { getUserManager } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/auth-redirect";

export default function CallbackPage() {
  const [error, setError] = useState<string>();
  useEffect(() => {
    // Success is only reported once the code exchange and token validation have completed.
    getUserManager().signinRedirectCallback()
      .then(user => {
        const state = user.state as { returnTo?: unknown } | undefined;
        window.location.replace(safeRedirectPath(state?.returnTo));
      })
      .catch(() => {
        setError("We couldn't complete sign-in.");
        window.location.replace("/login?error=callback");
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
