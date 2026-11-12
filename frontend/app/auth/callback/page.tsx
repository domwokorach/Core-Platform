"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { getUserManager } from "@/lib/auth";

export default function CallbackPage() {
  const [error, setError] = useState<string>();
  useEffect(() => {
    getUserManager().signinRedirectCallback()
      .then(() => { window.location.replace("/"); })
      .catch(err => setError(err instanceof Error ? err.message : "Could not finish sign-in"));
  }, []);
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-card" role={error ? "alert" : "status"}>
        <LogoMark className="mx-auto size-10" />
        <h1 className="mt-5 text-lg font-semibold">{error ? "Sign-in failed" : "Completing secure sign-in…"}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{error || "Validating your identity with the OIDC provider."}</p>
        {error ? <Link href="/" className="mt-5 inline-block text-sm font-medium text-brand-text underline">Return to dashboard</Link> : <Loader2 className="mx-auto mt-5 size-5 animate-spin text-muted-foreground" />}
      </div>
    </main>
  );
}
