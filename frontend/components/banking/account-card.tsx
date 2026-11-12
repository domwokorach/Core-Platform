"use client";

import { motion } from "motion/react";
import { Nfc } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/utils/format";
import { AccountBalance } from "./account-balance";
import { VISA_BRANDING_APPROVED, VisaLogo } from "./visa-logo";
import type { Account } from "@/types/banking";

/**
 * Digital account card. Restrained depth on hover (≤1.02 scale), press feedback, decorative geometry only.
 * The card art is FINIX's own. A payment-network mark (Visa) appears only when branding is explicitly approved
 * (see VISA_BRANDING_APPROVED); otherwise the neutral chip is shown.
 */
export function AccountCard({ account, holder, variant = "navy", type, selected, onSelect, className, showBalance = true }: {
  account: Account; holder: string; variant?: "navy" | "teal"; type?: string; showBalance?: boolean; selected?: boolean; onSelect?: () => void; className?: string;
}) {
  const chip = <span aria-hidden className="h-6 w-9 rounded-md bg-gradient-to-br from-neutral-200 to-neutral-500" />;
  // The flag is the authorisation; `account.brand` is a DB default and is not proof of a Visa product.
  const showVisa = VISA_BRANDING_APPROVED;
  const body = (
    <>
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-[0.16]" viewBox="0 0 400 250" preserveAspectRatio="xMaxYMid slice">
        <circle cx="330" cy="40" r="120" fill="none" stroke="#fff" strokeWidth="1" />
        <circle cx="330" cy="40" r="80" fill="none" stroke="#fff" strokeWidth="1" />
        <circle cx="330" cy="40" r="40" fill="none" stroke="#fff" strokeWidth="1" />
        <path d="M-20 260 L180 120 L420 330" fill="none" stroke="#fff" strokeWidth="1" />
      </svg>
      <div className="relative flex items-start justify-between">
        <div><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">{type ?? account.displayName}</p><p className="mt-0.5 flex items-center gap-2 text-xs text-white/60">{account.currency}{showVisa && <span className="rounded-full border border-white/25 px-1.5 py-px text-[9px] uppercase tracking-wider text-white/60">Design demo</span>}</p></div>
        <Nfc className="size-5 rotate-90 text-white/70" aria-hidden />
      </div>
      {showBalance && (
        <div className="relative">
          <p className="text-[11px] uppercase tracking-wider text-white/60">Balance</p>
          <p className="text-[1.75rem] leading-tight tracking-tight"><AccountBalance balanceMinor={account.balanceMinor} currency={account.currency} className="text-green-400" /></p>
        </div>
      )}
      <div className="relative flex items-end justify-between gap-4 text-sm">
        <div className="min-w-0 flex-1"><p className="truncate text-xs text-white/70">{holder}</p><p className="num mt-0.5 font-medium tracking-[0.18em]">{account.maskedNumber}</p></div>
        {showVisa ? <VisaLogo tone="white" fallback={chip} /> : chip}
      </div>
    </>
  );
  const cls = cn(
    "relative flex aspect-[1.6/1] w-full min-w-[17rem] flex-col justify-between overflow-hidden rounded-2xl p-5 text-left text-white shadow-lift ring-1 ring-white/10 outline-none focus-visible:ring-2 focus-visible:ring-ring",
    variant === "navy" ? "card-navy" : "card-teal", selected && "ring-2 ring-brand", className,
  );
  const motionProps = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, whileHover: { y: -3, scale: 1.015 }, whileTap: { scale: 0.985 }, transition: { duration: 0.18 } } as const;
  return onSelect
    ? <motion.button type="button" onClick={onSelect} aria-pressed={selected} aria-label={showBalance ? `${account.displayName} ${account.maskedNumber}, balance ${money(account.balanceMinor, account.currency)}` : `${account.displayName} ${account.maskedNumber}`} className={cls} {...motionProps}>{body}</motion.button>
    : <motion.div role="group" aria-label={`${account.displayName} ${account.maskedNumber}`} className={cls} {...motionProps}>{body}</motion.div>;
}
