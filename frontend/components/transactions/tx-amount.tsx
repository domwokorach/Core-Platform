import { cn } from "@/lib/utils";
import { money, signedMoney } from "@/lib/utils/format";
import type { TxKind } from "@/lib/utils/analytics";

export function TxAmount({ minor, currency, kind, className }: { minor: number; currency: string; kind: TxKind; className?: string }) {
  return (
    <span className={cn("num font-semibold", "text-foreground", className)}>
      {kind === "transfer" ? `${minor < 0 ? "−" : "+"}${money(Math.abs(minor), currency)}` : signedMoney(minor, currency)}
    </span>
  );
}
