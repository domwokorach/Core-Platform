"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { CARD_STATUS } from "./card-status";
import type { Card } from "@/types/cards";

/**
 * Sandbox virtual card face. Shows the card's own masked reference and status; never a balance, and never the linked
 * account's digits as if they were a card number. Hover depth is restrained (≤1.02 scale) and disabled for reduced motion.
 */
export function VirtualCard({ card, selected, onSelect, className }: { card: Card; selected?: boolean; onSelect?: () => void; className?: string }) {
  const reduce = useReducedMotion();
  const light = card.cardType === "SAVINGS";
  const status = CARD_STATUS[card.status];
  const dim = card.status === "FROZEN" || card.status === "BLOCKED" || card.status === "CLOSED";
  const line = light ? "#171717" : "#ffffff";

  const body = (
    <>
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-[0.10]" viewBox="0 0 400 250" preserveAspectRatio="xMaxYMid slice" fill="none" stroke={line} strokeWidth="1">
        {light
          ? <><path d="M0 250 L250 0 M60 250 L310 0 M120 250 L370 0 M180 250 L430 0" /><circle cx="330" cy="200" r="90" /><circle cx="330" cy="200" r="55" /></>
          : <><circle cx="340" cy="30" r="130" /><circle cx="340" cy="30" r="90" /><circle cx="340" cy="30" r="50" /></>}
      </svg>
      <div className={cn("relative flex items-start justify-between gap-3", dim && "opacity-60")}>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.03em]">
            <svg aria-hidden viewBox="0 0 32 32" className="size-5"><rect width="32" height="32" rx="9" fill={line} /><path d="M9 23V9h13v3.6H13.2v2.2h7.1v3.4h-7.1V23H9Z" fill={light ? "#fafafa" : "#0a0a0a"} /></svg>
            FINIX
          </p>
          <p className={cn("mt-2 truncate text-[11px] font-medium uppercase tracking-[0.14em]", light ? "text-neutral-600" : "text-white/70")}>{card.linkedAccount.displayName}</p>
          <p className={cn("text-xs", light ? "text-neutral-600" : "text-white/60")}>{card.currency}</p>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium", light ? "bg-neutral-900/8 text-neutral-900 ring-1 ring-neutral-900/15" : "bg-white/12 text-white ring-1 ring-white/20")}>
          <status.icon className="size-3" aria-hidden />{status.label}
        </span>
      </div>
      <div className={cn("relative flex items-end justify-between gap-3", dim && "opacity-60")}>
        <div className="min-w-0">
          <p className={cn("text-[10px] uppercase tracking-[0.16em]", light ? "text-neutral-500" : "text-white/55")}>Cardholder</p>
          <p className="truncate text-sm font-medium">{card.cardholderName}</p>
          <p className="num mt-1 text-[13px] font-medium tracking-[0.14em]">{card.maskedReference}</p>
        </div>
        <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]", light ? "text-neutral-600 ring-1 ring-neutral-900/20" : "text-white/70 ring-1 ring-white/25")}>Virtual · Sandbox</span>
      </div>
    </>
  );

  const cls = cn(
    "relative flex aspect-[1.586/1] w-full flex-col justify-between overflow-hidden rounded-2xl p-5 text-left shadow-lift outline-none ring-1 focus-visible:ring-2 focus-visible:ring-ring",
    light ? "card-pearl text-neutral-900 ring-neutral-900/10" : "card-matte text-white ring-white/10",
    selected && "ring-2 ring-foreground", className,
  );
  const label = `${card.linkedAccount.displayName} virtual card, reference ${card.maskedReference}, ${status.label}`;
  const motionProps = reduce ? {} : { whileHover: { y: -3, scale: 1.015 }, whileTap: { scale: 0.985 }, transition: { duration: 0.18 } } as const;
  return onSelect
    ? <motion.button type="button" onClick={onSelect} aria-pressed={selected} aria-label={label} className={cls} {...motionProps}>{body}</motion.button>
    : <motion.div role="group" aria-label={label} className={cls} {...motionProps}>{body}</motion.div>;
}
