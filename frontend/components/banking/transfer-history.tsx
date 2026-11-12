"use client";

import { ArrowRightLeft, Send } from "lucide-react";
import { RevealGroup } from "@/components/animations/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { useDashboard, useTransfers } from "@/hooks/use-banking";
import { dateLong, money } from "@/lib/utils/format";
import { motion } from "motion/react";
import { rowEnter } from "@/lib/animations/variants";

export function TransferHistory() {
  const { data = [], isLoading, error, refetch, isFetching } = useTransfers();
  const { data: dash } = useDashboard();
  const name = (id: string) => dash?.accounts.find(a => a.id === id)?.displayName ?? "Account";
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} retrying={isFetching} />;
  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>;
  if (!data.length) return <EmptyState icon={Send} title="No transfers yet" description="Move money between your accounts and the confirmed transfer will be listed here." />;
  return (
    <RevealGroup delay={0.03} role="list" className="divide-y">
      {data.map(t => (
        <motion.div key={t.id} variants={rowEnter} role="listitem" className="flex items-center gap-3 py-3.5">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info-text"><ArrowRightLeft className="size-[18px]" /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{name(t.sourceAccountId)} → {name(t.destinationAccountId)}</p><p className="truncate text-xs text-muted-foreground">{dateLong(t.createdAt)} · <span className="font-mono">{t.reference}</span></p></div>
          <span className="num text-[15px] font-semibold">{money(t.amountMinor, t.currency)}</span>
        </motion.div>
      ))}
    </RevealGroup>
  );
}
