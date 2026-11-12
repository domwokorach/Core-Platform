"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { useAuth } from "@/providers/auth-provider";
import { DEMO_MODE } from "@/lib/auth";
import { loginUrl } from "@/lib/auth-redirect";

/** Protects every banking page: no session → /login (which starts the single Keycloak sign-in), remembering the destination. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, demo, loading, sessionEnded } = useAuth();
  const allowed = DEMO_MODE || Boolean(user) || Boolean(demo);

  useEffect(() => {
    if (loading || allowed) return;
    const here = loginUrl(window.location.pathname + window.location.search);
    // An ended session (expired / rejected token) must not silently restart sign-in: that is how redirect loops start.
    window.location.replace(sessionEnded ? `${here}${here.includes("?") ? "&" : "?"}error=expired` : here);
  }, [loading, allowed, sessionEnded]);

  if (allowed) return <>{children}</>;
  return (
    <main className="grid min-h-dvh place-items-center p-4" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4 text-center">
        <LogoMark className="size-10" />
        <p className="text-sm text-muted-foreground">{loading ? "Checking your session…" : "Taking you to secure sign-in…"}</p>
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    </main>
  );
}
