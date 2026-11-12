"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eye, EyeOff, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email address."),
  password: z.string().min(1, "Enter your password."),
});
type Values = z.infer<typeof schema>;

/** Subtle, always-visible marker for the development demo (also shown inside the app after sign-in). */
export function DevDemoBadge() {
  return (
    <div role="note" aria-label="Development demo" className="mb-5 rounded-xl border bg-muted px-4 py-3 text-sm">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-background"><FlaskConical className="size-3.5" aria-hidden />Development Demo</span>
      <p className="mt-2 text-[13px] leading-snug text-muted-foreground">Demo mode uses fictional banking data. No real financial transactions are available.</p>
    </div>
  );
}

/**
 * Local-development demo sign-in. The credentials are checked by the server-only /api/demo/login route (404 in production);
 * nothing secret lives in this bundle, no token is created and nothing is stored in the browser.
 */
export function DemoSignInForm({ onSuccess, prefill }: { onSuccess: () => void; prefill?: { email: string; password: string; n: number } }) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" }, mode: "onTouched" });

  // "Use demo credentials" only fills the controlled fields; the user still submits and the server still verifies.
  useEffect(() => {
    if (!prefill) return;
    setValue("email", prefill.email, { shouldValidate: true });
    setValue("password", prefill.password, { shouldValidate: true });
    setError(null);
  }, [prefill, setValue]);

  async function submit(values: Values) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/demo/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(values) });
      if (res.ok) { onSuccess(); return; }
      const body = await res.json().catch(() => ({})) as { message?: string };
      setError(res.status === 401 ? "Incorrect email address or password." : body.message ?? "Demo sign-in is unavailable.");
    } catch { setError("We couldn't reach the demo sign-in. Please try again."); }
    setBusy(false);
  }

  const fieldError = (id: string, text?: string) => text && (
    <motion.p id={id} initial={reduce ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-1.5 text-[13px] font-medium">{text}</motion.p>
  );

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4" aria-label="Demo sign in">
      <div aria-live="assertive">
        <AnimatePresence initial={false}>
          {error && (
            <motion.p role="alert" key={error} initial={reduce ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
              className="rounded-xl border border-foreground bg-muted px-3.5 py-3 text-sm font-medium">{error}</motion.p>
          )}
        </AnimatePresence>
      </div>
      <div>
        <Label htmlFor="demo-email" className="mb-2 block text-sm font-medium">Email address</Label>
        <Input id="demo-email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="name@example.com"
          aria-invalid={!!errors.email} aria-describedby={errors.email ? "demo-email-error" : undefined} className="h-12 rounded-xl text-base sm:h-12 sm:text-base" {...register("email")} />
        {fieldError("demo-email-error", errors.email?.message)}
      </div>
      <div>
        <Label htmlFor="demo-password" className="mb-2 block text-sm font-medium">Password</Label>
        <div className="relative">
          <Input id="demo-password" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password"
            aria-invalid={!!errors.password} aria-describedby={errors.password ? "demo-password-error" : undefined} className="h-12 rounded-xl pr-12 text-base sm:h-12 sm:text-base" {...register("password")} />
          <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} aria-controls="demo-password"
            className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2">
            {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        </div>
        {fieldError("demo-password-error", errors.password?.message)}
      </div>
      <Button type="submit" size="lg" disabled={busy} className="h-[52px] w-full rounded-xl text-base transition-transform duration-150 active:scale-[0.985]">
        {busy ? <><Loader2 className="animate-spin" aria-hidden />Signing in…</> : "Sign In"}
      </Button>
    </form>
  );
}
