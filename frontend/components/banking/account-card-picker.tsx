"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountBalance } from "./account-balance";
import { Tabs, TabsList, TabsTrigger } from "@/components/paceui/motion/tabs";
import type { Account } from "@/types/banking";

const CARDS = [
  { key: "black", label: "FINIX Visa Black", src: "/cards/finix-visa-black.png", width: 1448, height: 1086 },
  { key: "silver", label: "FINIX Visa Silver", src: "/cards/finix-visa-silver-cutout.png", width: 1447, height: 1087 },
] as const;

/** Cards are assigned by position so each account keeps a stable design. */
const cardFor = (i: number) => CARDS[i % CARDS.length];

/** Account panels with a small linked-card preview; selecting one shows its card at a larger size. */
export function AccountCardPicker({ accounts, holder, selectedId: controlled, onSelectedChange }: { accounts: Account[]; holder: string; selectedId?: string; onSelectedChange?: (id: string) => void }) {
  const [internal, setInternal] = useState(accounts[0]?.id);
  const selectedId = controlled ?? internal;
  const setSelectedId = (id: string) => { setInternal(id); onSelectedChange?.(id); };
  const index = Math.max(0, accounts.findIndex(a => a.id === selectedId));
  const selected = accounts[index];
  const card = cardFor(index);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <ul className="order-2 grid content-start gap-3 lg:order-1" aria-label="Your accounts">
        {accounts.map((a, i) => {
          const c = cardFor(i);
          const active = a.id === selected.id;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setSelectedId(a.id)}
                aria-pressed={active}
                aria-label={`${a.displayName} ${a.maskedNumber}, ${c.label}`}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl border bg-card p-3 text-left outline-none transition-colors sm:p-4",
                  "hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-foreground shadow-sm" : "border-border",
                )}
              >
                <span className="w-[88px] shrink-0 sm:w-[120px]"><Image src={c.src} alt="" width={c.width} height={c.height} sizes="(min-width: 640px) 120px, 88px" className="block h-auto w-full drop-shadow-[0_6px_10px_rgb(0_0_0/0.25)]" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{a.displayName}</span>
                  <span className="num block truncate text-sm text-muted-foreground">{a.maskedNumber} · {a.currency}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{c.label}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Available</span>
                  <AccountBalance balanceMinor={a.balanceMinor} currency={a.currency} className="font-semibold" />
                  {active && <Check className="size-4" aria-hidden />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <section aria-live="polite" aria-label="Linked card" className="order-1 rounded-2xl border border-border bg-gradient-to-b from-muted/60 to-card p-5 lg:sticky lg:top-6 lg:order-2 lg:self-start">
        {accounts.length > 1 && (
          <Tabs value={selected.id} onValueChange={v => setSelectedId(String(v))} className="mb-4 max-w-full overflow-x-auto">
            <TabsList aria-label="Accounts" className="w-fit">{accounts.map(a => <TabsTrigger key={a.id} value={a.id}>{a.displayName}</TabsTrigger>)}</TabsList>
          </Tabs>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            <div className="mx-auto w-full max-w-sm"><Image src={card.src} alt={`${card.label} card linked to ${selected.displayName}`} width={card.width} height={card.height} sizes="(min-width: 1024px) 352px, 90vw" priority className="block h-auto w-full drop-shadow-[0_18px_24px_rgb(0_0_0/0.28)]" /></div>
          </motion.div>
        </AnimatePresence>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">Account</dt><dd className="truncate font-medium">{selected.displayName}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Card type</dt><dd className="font-medium">{card.label}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Account number</dt><dd className="num font-medium">{selected.maskedNumber}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Available balance</dt><dd><AccountBalance balanceMinor={selected.balanceMinor} currency={selected.currency} className="font-semibold" /></dd></div>
          <div className="col-span-2"><dt className="text-xs text-muted-foreground">Holder</dt><dd className="truncate font-medium">{holder}</dd></div>
        </dl>
      </section>
    </div>
  );
}
