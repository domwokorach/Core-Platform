"use client";

import { Ban, CheckCircle2, Globe, History, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMedia } from "@/hooks/use-media";
import { dateLong, money } from "@/lib/utils/format";
import { useState } from "react";
import type { CardActivity, CardTransaction } from "@/types/cards";

const DECLINE: Record<string, string> = {
  CARD_NOT_ACTIVE: "Card not active", CARD_FROZEN: "Card frozen", ACCOUNT_INACTIVE: "Account inactive", ONLINE_DISABLED: "Online payments off",
  SINGLE_LIMIT_EXCEEDED: "Over single-transaction limit", DAILY_LIMIT_EXCEEDED: "Over daily limit", MONTHLY_LIMIT_EXCEEDED: "Over monthly limit",
};
const EVENT: Record<string, string> = {
  CARD_CREATED: "Card issued", CARD_ACTIVATED: "Card activated", CARD_FROZEN: "Card frozen", CARD_UNFROZEN: "Card unfrozen",
  LIMITS_UPDATED: "Spending limits updated", AUTHORIZATION_DECLINED: "Purchase declined",
};

function Outcome({ t }: { t: CardTransaction }) {
  return t.outcome === "APPROVED"
    ? <Badge tone="success"><CheckCircle2 aria-hidden />Approved</Badge>
    : <Badge tone="danger"><Ban aria-hidden />Declined</Badge>;
}
const Channel = ({ c }: { c: CardTransaction["channel"] }) => (c === "ONLINE" ? <><Globe className="size-3.5" aria-hidden />Online</> : <><Store className="size-3.5" aria-hidden />In store</>);
const amount = (t: CardTransaction) => <span data-accent className={t.outcome === "APPROVED" ? "num font-semibold text-expense-text" : "num text-muted-foreground line-through"}>−{money(t.amountMinor, t.currency)}</span>;

export function CardActivityPanel({ transactions, activity, loading }: { transactions: CardTransaction[]; activity: CardActivity[]; loading: boolean }) {
  const wide = useMedia("(min-width: 768px)");
  const [tab, setTab] = useState("transactions");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label="Card history">
        <TabsTrigger value="transactions" active={tab === "transactions"} group="card-tabs">Transactions</TabsTrigger>
        <TabsTrigger value="activity" active={tab === "activity"} group="card-tabs">Activity log</TabsTrigger>
      </TabsList>
      <TabsContent value="transactions" className="mt-4">
        {loading ? <Skeleton className="h-40 w-full" /> : !transactions.length
          ? <p className="py-8 text-center text-sm text-muted-foreground">No card transactions yet. Sandbox purchases will appear here.</p>
          : wide ? (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Merchant</TableHead><TableHead>Channel</TableHead><TableHead>Date</TableHead><TableHead>Result</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{transactions.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.merchantName}</TableCell>
                  <TableCell><span className="inline-flex items-center gap-1.5 text-muted-foreground"><Channel c={t.channel} /></span></TableCell>
                  <TableCell className="text-muted-foreground">{dateLong(t.occurredAt)}</TableCell>
                  <TableCell><div className="flex flex-col items-start gap-1"><Outcome t={t} />{t.declineReason && <span className="text-xs text-muted-foreground">{DECLINE[t.declineReason] ?? t.declineReason}</span>}</div></TableCell>
                  <TableCell className="text-right">{amount(t)}</TableCell>
                </TableRow>))}</TableBody>
            </Table>
          ) : (
            <ul className="divide-y">{transactions.map(t => (
              <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.merchantName}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Channel c={t.channel} /></span><span>{dateLong(t.occurredAt)}</span></p>
                  {t.declineReason && <p className="mt-0.5 text-xs text-muted-foreground">{DECLINE[t.declineReason] ?? t.declineReason}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 text-sm">{amount(t)}<Outcome t={t} /></div>
              </li>))}</ul>
          )}
      </TabsContent>
      <TabsContent value="activity" className="mt-4">
        {loading ? <Skeleton className="h-32 w-full" /> : !activity.length
          ? <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
          : <ol className="space-y-3">{activity.map(a => (
              <li key={a.id} className="flex items-center gap-3 text-sm"><History className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="font-medium">{EVENT[a.eventType] ?? a.eventType}</span><span className="ml-auto shrink-0 text-xs text-muted-foreground">{dateLong(a.occurredAt)}</span></li>))}</ol>}
      </TabsContent>
    </Tabs>
  );
}
