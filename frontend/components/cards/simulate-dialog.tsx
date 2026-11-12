"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-media";
import { reportCardError, useSimulateAuthorization } from "@/hooks/use-cards";
import { money, toMinor } from "@/lib/utils/format";
import type { Card } from "@/types/cards";

const REASON: Record<string, string> = {
  CARD_NOT_ACTIVE: "the card isn’t active", CARD_FROZEN: "the card is frozen", ACCOUNT_INACTIVE: "the linked account isn’t active", ONLINE_DISABLED: "online payments are turned off",
  SINGLE_LIMIT_EXCEEDED: "it’s over the single-transaction limit", DAILY_LIMIT_EXCEEDED: "it would exceed the daily limit", MONTHLY_LIMIT_EXCEEDED: "it would exceed the monthly limit",
};

/** Sandbox-only: runs a pretend purchase through the real server-side authorization rules. It moves no money. */
export function SimulateDialog({ card, open, onClose }: { card: Card; open: boolean; onClose: () => void }) {
  const mobile = useIsMobile();
  const sim = useSimulateAuthorization();
  const [merchant, setMerchant] = useState("Sandbox Coffee");
  const [amount, setAmount] = useState("12.50");
  const [channel, setChannel] = useState<"IN_STORE" | "ONLINE">("IN_STORE");
  const valid = /^\d+(\.\d{1,2})?$/.test(amount) && toMinor(amount) > 0 && merchant.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await sim.mutateAsync({ cardId: card.id, merchantName: merchant.trim(), amountMinor: toMinor(amount), channel });
      if (r.outcome === "APPROVED") toast.success(`Approved: ${money(r.amountMinor)} at ${r.merchantName} (sandbox, no money moved)`);
      else toast.error(`Declined: ${REASON[r.declineReason ?? ""] ?? "not permitted"}`);
      onClose();
    } catch (err) { reportCardError(err, "The sandbox purchase could not be simulated."); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !sim.isPending) onClose(); }}>
      <DialogContent side={mobile ? "bottom" : "center"} className="p-6">
        <DialogTitle className="pr-8">Simulate a purchase</DialogTitle>
        <DialogDescription className="mt-1.5">Test this card’s status and limits. Sandbox only: no real merchant is contacted and no money moves.</DialogDescription>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div><Label htmlFor="sim-merchant">Merchant</Label><Input id="sim-merchant" className="mt-1.5" maxLength={80} value={merchant} onChange={e => setMerchant(e.target.value)} /></div>
          <div><Label htmlFor="sim-amount">Amount (GBP)</Label>
            <div className="relative mt-1.5"><span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
              <Input id="sim-amount" inputMode="decimal" className="num pl-8" value={amount} onChange={e => setAmount(e.target.value)} aria-invalid={!valid} /></div></div>
          <div role="radiogroup" aria-label="Channel" className="grid grid-cols-2 gap-3">
            {(["IN_STORE", "ONLINE"] as const).map(c => (
              <button key={c} type="button" role="radio" aria-checked={channel === c} onClick={() => setChannel(c)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring ${channel === c ? "border-foreground bg-muted" : "border-input"}`}>{c === "ONLINE" ? "Online" : "In store"}</button>))}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={sim.isPending} className="max-sm:h-12 max-sm:w-full">Cancel</Button>
            <Button type="submit" loading={sim.isPending} disabled={!valid} className="max-sm:h-12 max-sm:w-full">Run authorization</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
