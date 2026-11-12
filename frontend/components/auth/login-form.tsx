"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Loader2, Lock, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthError, type AuthErrorKey, AUTH_ERRORS } from "@/components/auth/auth-error";
import { LogoMark } from "@/components/layout/logo";
import { DemoSignInForm, DevDemoBadge } from "@/components/auth/demo-sign-in-form";
import { DevelopmentAccount, type DevAccount } from "@/components/auth/development-account";
import { useAuth } from "@/providers/auth-provider";
import { getRegistrationManager, getUserManager } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/auth-redirect";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * FINIX holds no credential form. This route immediately starts Authorization Code + PKCE with Keycloak,
 * which renders the one (FINIX-themed) credential screen. Auto-start is skipped when we arrive with an
 * error or after sign-out, so a failing sign-in can never bounce between the two sites.
 */
export function LoginForm({ returnTo, initialError, signedOut, loginHint, register, demoEnabled, devAccount }: { returnTo?: string; initialError?: string; signedOut?: boolean; loginHint?: string; register?: boolean; demoEnabled?: boolean; devAccount?: DevAccount | null }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { user, demo, loading } = useAuth();
  // Server-decided (development + explicit opt-in). Keycloak sign-in stays available from the same page.
  const demoMode = Boolean(demoEnabled) && !register;
  // Keycloak cannot carry returnTo back after an expired attempt, so it is also kept (validated) for this tab only.
  const [stored, setStored] = useState<string>();
  useEffect(() => { try { setStored(sessionStorage.getItem("finix.returnTo") ?? undefined); } catch { /* storage unavailable */ } }, []);
  const destination = safeRedirectPath(returnTo ?? stored);
  const [error, setError] = useState<AuthErrorKey | null>(initialError && initialError in AUTH_ERRORS ? (initialError as AuthErrorKey) : null);
  const [redirecting, setRedirecting] = useState(false);
  const [prefill, setPrefill] = useState<{ email: string; password: string; n: number }>();
  const started = useRef(false);
  const noun = register ? "Create your FINIX account" : "Sign in to your account";
  const manual = Boolean(error) || Boolean(signedOut) || demoMode;

  const start = useCallback(async () => {
    if (started.current) return; // StrictMode / double-click guard: one authorization request per attempt
    started.current = true;
    setError(null);
    setRedirecting(true);
    try { sessionStorage.setItem("finix.returnTo", destination); } catch { /* storage unavailable */ }
    try {
      // `state` and the PKCE verifier/challenge are generated fresh by the library for every attempt; the nonce is bound to the
      // stored request and checked against the ID token on callback.
      const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      await (register ? getRegistrationManager() : getUserManager()).signinRedirect({ state: { returnTo: destination }, nonce, login_hint: loginHint?.slice(0, 254) || undefined });
    } catch {
      started.current = false;
      setRedirecting(false);
      setError("unavailable");
    }
  }, [destination, loginHint]);

  // OIDC state lives in per-origin sessionStorage and the callback URI is registered for one origin,
  // so sign-in must start on the configured app origin (not 127.0.0.1 or a LAN address).
  useEffect(() => {
    const canonical = process.env.NEXT_PUBLIC_APP_ORIGIN;
    if (canonical && canonical !== window.location.origin) window.location.replace(`${canonical}/login${window.location.search}`);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user || demo) { started.current = true; setRedirecting(true); router.replace(destination); return; }
    const canonical = process.env.NEXT_PUBLIC_APP_ORIGIN;
    if (canonical && canonical !== window.location.origin) return;
    if (!manual) void start();
  }, [loading, user, demo, manual, destination, router, start]);

  const enter = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease } };

  return (
    <div className="flex flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
      <div className="flex flex-1 items-center justify-center py-8 sm:py-12">
        <motion.div {...enter} className="w-full max-w-[420px]">
          <LogoMark className="size-10" />
          {error === "timeout" ? (
            <div role="alert" className="mt-6 rounded-3xl border bg-card p-7 shadow-card">
              <span className="grid size-12 place-items-center rounded-2xl bg-muted"><TriangleAlert className="size-6" aria-hidden /></span>
              <h1 className="mt-5 text-[26px] font-semibold leading-tight tracking-[-0.03em]">{AUTH_ERRORS.timeout.title}</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{AUTH_ERRORS.timeout.body}</p>
              <Button type="button" size="lg" disabled={redirecting} onClick={() => void start()} className="mt-6 h-[52px] w-full rounded-xl text-base">
                {redirecting ? <><Loader2 className="animate-spin" aria-hidden />Redirecting…</> : "Try signing in again"}
              </Button>
              <Link href="/" className="mt-3 flex min-h-11 items-center justify-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Back to FINIX</Link>
            </div>
          ) : (<>
          <h1 className="mt-6 text-[28px] font-semibold leading-tight tracking-[-0.03em]">
            {signedOut && !error ? "You've been signed out" : manual ? noun : register ? "Taking you to secure registration" : "Taking you to secure sign-in"}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {signedOut && !error ? "Your FINIX session has ended on this device." : "Welcome back to FINIX. Securely access all your banking services with one account."}
          </p>

          <div className="mt-7">
            <AuthError error={error} />
            {demoMode ? (
              <>
                <DevDemoBadge />
                {devAccount && <DevelopmentAccount account={devAccount} onUse={a => setPrefill(p => ({ email: a.username, password: a.password, n: (p?.n ?? 0) + 1 }))} />}
                <DemoSignInForm prefill={prefill} onSuccess={() => { started.current = true; setRedirecting(true); window.location.assign(returnTo ? destination : "/dashboard"); }} />
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
                <Button type="button" variant="outline" size="lg" disabled={redirecting} onClick={() => void start()} className="h-[52px] w-full rounded-xl text-base">
                  {redirecting ? <><Loader2 className="animate-spin" aria-hidden />Redirecting…</> : "Continue with secure sign-in"}
                </Button>
              </>
            ) : manual ? (
              <Button type="button" size="lg" disabled={redirecting} onClick={() => void start()} className="h-[52px] w-full rounded-xl text-base">
                {redirecting ? <><Loader2 className="animate-spin" aria-hidden />Redirecting…</> : error ? "Try again" : register ? "Create account" : "Sign in"}
              </Button>
            ) : (
              <div role="status" aria-live="polite" className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />Redirecting to secure sign-in…
              </div>
            )}
          </div>

          </>)}
          {!demoMode && <p className="mt-6 flex items-center gap-2 text-[13px] text-muted-foreground"><Lock className="size-3.5 shrink-0" aria-hidden />You enter your password only on FINIX&apos;s secure sign-in page.</p>}
        </motion.div>
      </div>

      <footer aria-label="Legal information" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
        <span>© {new Date().getFullYear()} FINIX</span>
        <Link href="/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">Privacy Policy</Link>
        <Link href="/terms" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">Terms of Service</Link>
      </footer>
    </div>
  );
}
