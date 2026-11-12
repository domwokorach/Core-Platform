"use client";

import { motion } from "motion/react";
import { RevealGroup } from "@/components/animations/reveal";
import { rowEnter } from "@/lib/animations/variants";
import { dateShort } from "@/lib/utils/format";
import type { Row } from "@/hooks/use-activity";
import { TxAmount } from "./tx-amount";
import { TxIcon } from "./tx-icon";

/** Compact tap-friendly rows used on mobile and in dashboard "recent activity". */
export function TransactionList({ rows, onSelect }: { rows: Row[]; onSelect: (r: Row) => void }) {
  return (
    <RevealGroup delay={0.03} role="list" className="divide-y">
      {rows.map(r => (
        <motion.div key={r.id} variants={rowEnter} role="listitem">
          <button onClick={() => onSelect(r)} className="group flex min-h-16 w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 sm:px-2" aria-label={`${r.merchant?.name ?? r.description}, ${r.amountMinor < 0 ? "debit" : "credit"} ${Math.abs(r.amountMinor) / 100} ${r.currency}, ${dateShort(r.occurredAt)}. View details`}>
            <TxIcon merchant={r.merchant} name={r.description} kind={r.kind} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{r.merchant?.name ?? r.description}</span>
              <span className="block truncate text-xs text-muted-foreground">{dateShort(r.occurredAt)} · {r.merchant?.category ?? (r.kind === "transfer" ? "Transfer" : r.kind === "credit" ? "Credit" : "Debit")} · Completed</span>
            </span>
            <TxAmount minor={r.amountMinor} currency={r.currency} kind={r.kind} className="text-[15px]" />
          </button>
        </motion.div>
      ))}
    </RevealGroup>
  );
}
