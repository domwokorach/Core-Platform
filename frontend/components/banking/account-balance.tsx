import { cn } from "@/lib/utils";
import { DEFAULT_CURRENCY, money } from "@/lib/utils/format";

/** Balances are green with no leading plus. Pass `text-green-400` via className on always-dark surfaces. */
export function AccountBalance({ balanceMinor, currency = DEFAULT_CURRENCY, className }: { balanceMinor: number; currency?: string; className?: string }) {
  return (
    <span data-accent className={cn("num whitespace-nowrap font-bold tabular-nums text-green-600 dark:text-green-400", className)}>
      {money(balanceMinor, currency)}
    </span>
  );
}
