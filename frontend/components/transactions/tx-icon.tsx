import { ArrowDownLeft, ArrowRightLeft } from "lucide-react";
import { MerchantLogo } from "@/components/banking/merchant-logo";
import { cn } from "@/lib/utils";
import type { TxKind } from "@/lib/utils/analytics";
import type { Merchant } from "@/types/banking";

/**
 * Leading visual for a transaction row.
 *  - verified merchant → real brand logo (falls back to a neutral store icon if the logo can't load)
 *  - unknown merchant (debit) → neutral store icon, never an invented logo
 *  - own-account transfer / incoming credit → neutral directional glyph (these are not merchants)
 */
export function TxIcon({ merchant, name, kind, size = "md", className }: { merchant?: Merchant | null; name: string; kind: TxKind; size?: "sm" | "md" | "lg"; className?: string }) {
  if (kind === "transfer" || (kind === "credit" && !merchant)) {
    const Icon = kind === "transfer" ? ArrowRightLeft : ArrowDownLeft;
    const dims = size === "lg" ? "size-14" : "size-9 sm:size-10 lg:size-11";
    return <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-xl border border-border bg-muted text-foreground", dims, className)}><Icon className="size-[45%]" /></span>;
  }
  return <MerchantLogo merchant={merchant} name={name} size={size} className={cn("transition-transform duration-150 group-hover:scale-105", className)} />;
}
