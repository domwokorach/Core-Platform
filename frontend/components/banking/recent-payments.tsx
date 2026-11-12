"use client";

import { MerchantLogo } from "@/components/banking/merchant-logo";
import { TransactionAmount } from "@/components/transactions/transaction-amount";
import { useActivity } from "@/hooks/use-activity";
import { dateShort } from "@/lib/utils/format";

/** Latest merchant payments (verified merchants only) for notification surfaces. */
export function RecentPayments({ limit = 3, dense = false }: { limit?: number; dense?: boolean }) {
  const { all, isLoading } = useActivity();
  const items = all.filter(t => t.merchant && t.kind === "debit").slice(0, limit);
  if (isLoading || items.length === 0) return null;
  return (
    <ul role="list" aria-label="Recent payments" className={dense ? "divide-y" : "divide-y"}>
      {items.map(t => (
        <li key={t.id} className={dense ? "flex items-center gap-3 px-4 py-3 text-sm" : "flex items-center gap-3 py-3 text-sm"}>
          <MerchantLogo merchant={t.merchant} name={t.description} size={dense ? "sm" : "md"} />
          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{t.merchant!.name}</span><span className="block truncate text-xs text-muted-foreground">{t.merchant!.category} · {dateShort(t.occurredAt)} · Completed</span></span>
          <TransactionAmount amountMinor={t.amountMinor} currency={t.currency} className="text-sm" />
        </li>
      ))}
    </ul>
  );
}
