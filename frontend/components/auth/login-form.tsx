"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Info, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AuthError, type AuthErrorKey, AUTH_ERRORS } from "@/components/auth/auth-error";
import { LogoMark } from "@/components/layout/logo";
import { useAuth } from "@/providers/auth-provider";
import { getUserManager } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/auth-redirect";
import { loginSchema, type LoginValues } from "@/lib/schemas";

const ease = [0.22, 1, 0.36, 1] as const;

export function LoginForm({ returnTo, initialError }: { returnTo?: string; initialError?: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { user, loading } = useAuth();
  const destination = safeRedirectPath(returnTo);
  const [error, setError] = useState<AuthErrorKey | null>(initialError && initialError in AUTH_ERRORS ? (initialError as AuthErrorKey) : null);
  const [redirecting, setRedirecting] = useState(false);
  const submitting = useRef(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema), defaultValues: { identifier: "" }, mode: "onTouched",
  });

  // Already authenticated: go straight to the intended destination.
  useEffect(() => {
    if (!loading && user) { setRedirecting(true); router.replace(destination); }
  }, [loading, user, destination, router]);

  async function onSubmit({ identifier }: LoginValues) {
    if (submitting.current) return; // guard against double submits
    submitting.current = true;
    setError(null);
    setRedirecting(true);
    try {
      // Authorization Code + PKCE. Credentials are entered only on the identity provider.
      await getUserManager().signinRedirect({
        state: { returnTo: destination },
        login_hint: identifier,
      });
    } catch {
      submitting.current = false;
      setRedirecting(false);
      setError("unavailable");
    }
  }

  const enter = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease } };
  const busy = redirecting;
  const idError = errors.identifier?.message;

  return (
    <div className="flex flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
      <div className="flex items-center justify-between sm:hidden">
        <motion.span {...(reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } })} className="flex items-center gap-2.5">
          <LogoMark className="size-9" /><span className="text-xl font-semibold tracking-[-0.03em]">FINIX</span>
        </motion.span>
      </div>

      <div className="flex flex-1 items-center justify-center py-8 sm:py-12">
        <motion.div {...enter} className="w-full max-w-[420px]">
          <p className="mb-3 hidden items-center gap-2 text-[13px] font-medium text-muted-foreground sm:flex"><LogoMark className="size-5" />Welcome back</p>
          <p className="mb-2 text-[13px] font-medium text-muted-foreground sm:hidden">Welcome back</p>
          <h1 className="text-balance text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] sm:text-[2rem]">Sign in to your account</h1>
          <p className="mt-2.5 text-pretty text-[15px] leading-relaxed text-muted-foreground">
            Welcome back to FINIX. Enter your details to securely access your banking dashboard.
          </p>

          <div className="mt-8">
            <AuthError error={error} />
            {loading ? (
              <div className="space-y-5" aria-busy="true" aria-label="Loading sign-in form">
                <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-12 w-full rounded-xl" /></div>
                <Skeleton className="h-[52px] w-full rounded-xl" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5" aria-busy={busy}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="identifier" className="text-sm">Email address or username</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="Why am I not asked for a password here?" className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground">
                            <Info className="size-4" aria-hidden />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-60 text-pretty">For your security, your password is entered on our secure sign-in service, never on this page.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="identifier" type="text" inputMode="email" autoComplete="username webauthn" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    autoFocus placeholder="Enter your email or username" disabled={busy}
                    aria-invalid={!!idError} aria-describedby={idError ? "identifier-error" : undefined}
                    className="h-12 rounded-xl text-base sm:h-12 sm:text-base"
                    {...register("identifier")}
                  />
                  <div aria-live="polite">
                    {idError && <motion.p id="identifier-error" initial={reduce ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="text-[13px] font-medium text-foreground">{idError}</motion.p>}
                  </div>
                </div>

                <Button type="submit" size="lg" disabled={busy} aria-disabled={busy} className="h-[52px] w-full rounded-xl text-base transition-[background-color,box-shadow,transform] duration-150 hover:shadow-lift">
                  {busy ? <><Loader2 className="animate-spin" aria-hidden />Signing you in...</> : <>Sign in securely<ArrowRight aria-hidden /></>}
                </Button>
                <p role="status" className="sr-only">{busy ? "Signing you in. Redirecting to secure sign-in." : ""}</p>
              </form>
            )}
          </div>

          <p className="mt-6 flex items-center gap-2 text-[13px] text-muted-foreground"><Lock className="size-3.5 shrink-0" aria-hidden />Protected by secure authentication.</p>
        </motion.div>
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
        <span>© {new Date().getFullYear()} FINIX</span>
        <a href="/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">Privacy Policy</a>
        <a href="/terms" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline">Terms of Service</a>
      </footer>
    </div>
  );
}
