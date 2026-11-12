"use client";

import { FlaskConical, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

/** Always visible while a development demo session is active. */
export function DevDemoNotice() {
  return (
    <div role="note" aria-label="Development demo" className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border bg-muted px-4 py-3 text-sm">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-background"><FlaskConical className="size-3.5" aria-hidden />Development Demo</span>
      <span className="text-muted-foreground">Demo mode uses fictional banking data. No real financial transactions are available.</span>
    </div>
  );
}

/** Signed-out state: all numbers are fictional samples and the UI says so. */
export function DemoBanner() {
  const { user, demo, loading, signIn, authError } = useAuth();
  if (!user && demo) return <DevDemoNotice />;
  if (loading || user) return authError && !user ? <p role="alert" className="mb-4 rounded-lg bg-destructive-soft px-4 py-3 text-sm text-destructive-text">{authError}</p> : null;
  return (
    <div role="note" className="mb-5 flex flex-col gap-3 rounded-xl border border-dashed border-foreground/40 bg-muted px-4 py-3 text-sm text-warning-text sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2.5"><FlaskConical className="mt-0.5 size-4 shrink-0" /><span><strong>Interactive demo.</strong> Figures below are fictional samples. Sign in to see your ledger-backed accounts.</span></p>
      <Button size="sm" variant="default" onClick={() => void signIn()} className="shrink-0 self-start sm:self-auto"><LogIn />Sign in</Button>
    </div>
  );
}
