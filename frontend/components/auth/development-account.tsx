"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, ChevronDown, Copy, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type DevAccount = { username: string; password: string };

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable (insecure context or permission denied) */ }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm font-medium">{value}</p>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={() => void copy()} aria-label={`Copy ${label.toLowerCase()}`} className="size-11 shrink-0 rounded-lg">
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </Button>
      <span role="status" className="sr-only">{copied ? `${label} copied` : ""}</span>
    </div>
  );
}

/**
 * Collapsible local-only credentials card. Rendered by the server page only when demo auth is enabled, with the account passed
 * as props, so nothing here ships in a production render. "Use demo credentials" only fills the form; it never submits it, and
 * authentication is still verified server-side / by Keycloak.
 */
export function DevelopmentAccount({ account, onUse }: { account: DevAccount; onUse: (account: DevAccount) => void }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelId = useId();

  return (
    <section aria-label="Development account" className="mb-5 rounded-2xl border bg-muted/60 shadow-sm dark:bg-card">
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls={panelId}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <FlaskConical className="size-4 shrink-0" aria-hidden />
          <span className="truncate text-sm font-semibold">Development Account</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Badge className="bg-foreground text-background">LOCAL ONLY</Badge>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.25, ease: "easeInOut" }} className="grid size-8 place-items-center">
            <ChevronDown className="size-4" aria-hidden />
          </motion.span>
        </span>
      </button>

      {/* Always mounted so the exit can animate; `inert` + visibility:hidden keep collapsed controls out of the tab order and a11y tree. */}
      <motion.div id={panelId} initial={false} inert={!open}
        animate={open ? { height: "auto", opacity: 1, visibility: "visible" } : { height: 0, opacity: 0, transitionEnd: { visibility: "hidden" } }}
        transition={{ duration: reduce ? 0 : open ? 0.3 : 0.24, ease: "easeInOut" }}
        style={{ overflow: "hidden", visibility: "hidden" }}>
        <div className="space-y-3 px-4 pb-4">
          <p className="text-[13px] leading-snug text-muted-foreground">Use these credentials to explore the FINIX development banking dashboard.</p>
          <CopyField label="Username" value={account.username} />
          <CopyField label="Password" value={account.password} />
          <Button type="button" variant="outline" onClick={() => onUse(account)} className="h-11 w-full rounded-xl">
            <ArrowRight aria-hidden />Use demo credentials
          </Button>
          <p className="text-xs leading-snug text-muted-foreground">Fictional development account for local use only. Authentication is still verified; filling the form does not sign you in.</p>
        </div>
      </motion.div>
    </section>
  );
}
