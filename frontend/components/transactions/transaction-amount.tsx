import { cn } from "@/lib/utils";
import { DEFAULT_CURRENCY, formatTransactionAmount } from "@/lib/utils/format";

/**
 * Ledger entries are per account, so the sign already reflects that account's perspective
 * (an own-account transfer is negative on the source entry and positive on the destination entry).
 * Colour is applied to the amount only, never the row.
 */
export function TransactionAmount({ amountMinor, currency = DEFAULT_CURRENCY, className }: { amountMinor: number; currency?: string; className?: string }) {
  const colour = amountMinor < 0 ? "text-red-600 dark:text-red-400" : amountMinor > 0 ? "text-green-600 dark:text-green-400" : "text-neutral-500";
  return (
    <span data-accent className={cn("num shrink-0 whitespace-nowrap text-right font-semibold tabular-nums", colour, className)}>
      {formatTransactionAmount(amountMinor, currency)}
    </span>
  );
}
