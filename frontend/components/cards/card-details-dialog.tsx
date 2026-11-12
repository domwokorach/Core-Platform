"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CardStatusBadge } from "./card-status";
import { useIsMobile } from "@/hooks/use-media";
import { money } from "@/lib/utils/format";
import type { Card } from "@/types/cards";

const when = (iso: string | null) => iso ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(iso)) : "Not yet";

/** Read-only details taken from the card record. A sandbox card has no card number, CVV or expiry, so none is shown. */
export function CardDetailsDialog({ card, open, onClose }: { card: Card; open: boolean; onClose: () => void }) {
  const mobile = useIsMobile();
  const rows: [string, React.ReactNode][] = [
    ["Type", card.cardType === "SAVINGS" ? "Savings (Silver)" : "Everyday (Black)"],
    ["Status", <CardStatusBadge key="s" status={card.status} />],
    ["Reference", <span key="r" className="num">{card.maskedReference}</span>],
    ["Cardholder", card.cardholderName],
    ["Linked account", <span key="a">{card.linkedAccount.displayName} · <span className="num">{card.linkedAccount.maskedNumber}</span></span>],
    ["Currency", card.currency],
    ["Daily limit", money(card.limits.dailyLimitMinor)],
    ["Monthly limit", money(card.limits.monthlyLimitMinor)],
    ["Single transaction", money(card.limits.singleTransactionLimitMinor)],
    ["Online payments", card.limits.onlineEnabled ? "On" : "Off"],
    ["Issued", when(card.createdAt)],
    ["Activated", when(card.activatedAt)],
  ];
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent side={mobile ? "bottom" : "center"} className="overflow-y-auto p-6 sm:max-w-lg">
        <DialogTitle className="pr-8">Card details</DialogTitle>
        <DialogDescription className="mt-1.5">Sandbox virtual card. No card number is generated or stored.</DialogDescription>
        <dl className="mt-5 divide-y rounded-xl border text-sm">
          {rows.map(([k, v]) => <div key={k} className="flex items-center justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
        </dl>
        <div className="mt-5 flex justify-end"><Button variant="outline" onClick={onClose} className="max-sm:h-12 max-sm:w-full">Close</Button></div>
      </DialogContent>
    </Dialog>
  );
}
