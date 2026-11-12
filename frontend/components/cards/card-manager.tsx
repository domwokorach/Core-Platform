"use client";

import { useState } from "react";
import { Ban, CheckCircle2, Globe, IdCard, Link2, PlayCircle, Receipt, SlidersHorizontal, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { ActionButton } from "@/components/banking/action-button";
import { Card as Panel, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SpendChart } from "@/components/charts/lazy-cards";
import { CardActivityPanel } from "./card-activity";
import { CardStatusBadge } from "./card-status";
import { ConfirmDialog } from "./confirm-dialog";
import { CardDetailsDialog } from "./card-details-dialog";
import { CardStatusAlert } from "./card-status-alert";
import { LimitsDialog } from "./limits-dialog";
import { SimulateDialog } from "./simulate-dialog";
import { reportCardError, useCardActivity, useCardCommand, useCardTransactions } from "@/hooks/use-cards";
import { useAuth } from "@/providers/auth-provider";
import { money } from "@/lib/utils/format";
import type { Card } from "@/types/cards";
import type { CardCommand } from "@/lib/api/client";

const COPY: Record<CardCommand, { title: string; body: string; confirm: string; done: string }> = {
  freeze: { title: "Freeze this card?", body: "All sandbox authorizations on this card will be declined until you unfreeze it. Your account and balances are not affected.", confirm: "Freeze card", done: "Card frozen" },
  unfreeze: { title: "Unfreeze this card?", body: "The card will accept sandbox authorizations again, within its limits.", confirm: "Unfreeze card", done: "Card unfrozen" },
  activate: { title: "Activate this card?", body: "The card will be able to accept sandbox authorizations, within its limits.", confirm: "Activate card", done: "Card activated" },
};

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit ? Math.round((used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium">{label}</span><span className="num text-muted-foreground">{money(used)} of {money(limit)}</span></div>
      <Progress value={pct} label={`${label} used`} className="mt-2" />
      <p className="mt-1 text-xs text-muted-foreground">{pct}% used · {money(Math.max(0, limit - used))} left</p>
    </div>
  );
}

export function CardManager({ card }: { card: Card }) {
  const { user } = useAuth();
  const command = useCardCommand();
  const tx = useCardTransactions(card.id);
  const act = useCardActivity(card.id);
  const [pending, setPending] = useState<CardCommand | null>(null);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const terminal = card.status === "BLOCKED" || card.status === "CLOSED";

  // Management needs a signed-in session; the signed-out demo is read-only.
  const guard = (fn: () => void) => () => { if (!user) { toast.info("Sign in to manage sandbox cards."); return; } fn(); };
  const run = async () => {
    if (!pending) return;
    try { await command.mutateAsync({ cardId: card.id, command: pending }); toast.success(COPY[pending].done); setPending(null); }
    catch (e) { reportCardError(e, "That action could not be completed."); setPending(null); }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Panel>
        <CardHeader><div className="min-w-0">
          <CardTitle className="flex flex-wrap items-center gap-2">{card.linkedAccount.displayName} card <CardStatusBadge status={card.status} /></CardTitle>
          <CardDescription className="num">{card.maskedReference}</CardDescription>
        </div></CardHeader>
        <CardContent className="space-y-6">
          <CardStatusAlert card={card} />
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {card.status === "PENDING_ACTIVATION" && <ActionButton className="h-11" onClick={guard(() => setPending("activate"))}><CheckCircle2 />Activate card</ActionButton>}
            {card.status === "ACTIVE" && <ActionButton variant="outline" className="h-11" onClick={guard(() => setPending("freeze"))}><Snowflake />Freeze Card</ActionButton>}
            {card.status === "FROZEN" && <ActionButton className="h-11" onClick={guard(() => setPending("unfreeze"))}><Snowflake />Unfreeze Card</ActionButton>}
            <ActionButton variant="outline" className="h-11" onClick={() => setDetailsOpen(true)}><IdCard />Card details</ActionButton>
            {!terminal && <ActionButton variant="outline" className="h-11" onClick={guard(() => setLimitsOpen(true))}><SlidersHorizontal />Card settings</ActionButton>}
            {!terminal && <ActionButton variant="outline" className="h-11" onClick={guard(() => setSimOpen(true))}><PlayCircle />Simulate purchase</ActionButton>}
          </div>
          {terminal && <p role="note" className="flex items-start gap-2 rounded-xl border-2 border-foreground/70 bg-muted px-3.5 py-3 text-sm"><Ban className="mt-0.5 size-4 shrink-0" aria-hidden />This card is {card.status.toLowerCase()} and can no longer be changed, activated or unfrozen. Contact support if you think this is a mistake.</p>}

          <section aria-label="Linked account" className="rounded-xl bg-muted p-3.5 text-sm">
            <p className="flex items-center gap-2 font-medium"><Link2 className="size-4" aria-hidden />Linked account</p>
            <p className="mt-1 text-muted-foreground">{card.linkedAccount.displayName} · <span className="num">{card.linkedAccount.maskedNumber}</span></p>
            <p className="mt-2 text-xs text-muted-foreground">Card controls apply to sandbox card authorizations only. They don’t restrict internal transfers between your accounts.</p>
          </section>

          <section aria-label="Spending limits and usage" className="space-y-4">
            <Meter label="Daily" used={card.spending.dailySpentMinor} limit={card.limits.dailyLimitMinor} />
            <Meter label="Monthly" used={card.spending.monthlySpentMinor} limit={card.limits.monthlyLimitMinor} />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border p-3"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Receipt className="size-3.5" aria-hidden />Single transaction</dt><dd className="num mt-1 font-medium">{money(card.limits.singleTransactionLimitMinor)}</dd></div>
              <div className="rounded-xl border p-3"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Globe className="size-3.5" aria-hidden />Online payments</dt><dd className="mt-1 font-medium">{card.limits.onlineEnabled ? "On" : "Off"}</dd></div>
            </dl>
          </section>
        </CardContent>
      </Panel>

      <div className="grid min-w-0 gap-5">
        <Panel>
          <CardHeader><div><CardTitle>Spending against limit</CardTitle><CardDescription>Approved sandbox purchases, last 7 days</CardDescription></div></CardHeader>
          <CardContent><SpendChart transactions={tx.data ?? []} dailyLimitMinor={card.limits.dailyLimitMinor} /></CardContent>
        </Panel>
        <Panel>
          <CardHeader><div><CardTitle>Card activity</CardTitle><CardDescription>Sandbox authorizations and changes to this card</CardDescription></div></CardHeader>
          <CardContent><CardActivityPanel transactions={tx.data ?? []} activity={act.data ?? []} loading={tx.isLoading || act.isLoading} /></CardContent>
        </Panel>
      </div>

      <ConfirmDialog open={pending !== null} title={pending ? COPY[pending].title : ""} description={pending ? COPY[pending].body : ""} confirmLabel={pending ? COPY[pending].confirm : ""}
        pending={command.isPending} onConfirm={() => void run()} onClose={() => setPending(null)} />
      <CardDetailsDialog card={card} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
      <LimitsDialog card={card} open={limitsOpen} onClose={() => setLimitsOpen(false)} />
      <SimulateDialog card={card} open={simOpen} onClose={() => setSimOpen(false)} />
    </div>
  );
}
