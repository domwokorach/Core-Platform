"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-media";
import { reportCardError, useIssueCard } from "@/hooks/use-cards";
import { CARD_DEFAULT_LIMITS, createCardSchema, type CreateCardValues } from "@/lib/schemas";
import { money } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { Account } from "@/types/banking";
import type { Card, CardType } from "@/types/cards";

const TYPES: { value: CardType; name: string; blurb: string }[] = [
  { value: "EVERYDAY", name: "Everyday card", blurb: "Matte black finish" },
  { value: "SAVINGS", name: "Savings card", blurb: "Pearl white finish" },
];

export function CreateCardDialog({ open, onClose, accounts, onCreated, defaultAccountId }: { open: boolean; onClose: () => void; accounts: Account[]; onCreated: (card: Card) => void; defaultAccountId?: string }) {
  const mobile = useIsMobile();
  const issue = useIssueCard();
  const key = useRef<string | null>(null);
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<CreateCardValues>({
    resolver: zodResolver(createCardSchema), defaultValues: { accountId: "", cardType: "EVERYDAY", acknowledged: false },
  });

  useEffect(() => { if (open) { key.current = null; reset({ accountId: accounts.find(a => a.id === defaultAccountId)?.id ?? accounts[0]?.id ?? "", cardType: "EVERYDAY", acknowledged: false }); } }, [open, accounts, defaultAccountId, reset]);
  // A new idempotency key is needed once the details change; retries of the same details reuse the key.
  useEffect(() => { const sub = watch(() => { key.current = null; }); return () => sub.unsubscribe(); }, [watch]);

  const onSubmit = async (v: CreateCardValues) => {
    key.current ??= crypto.randomUUID();
    try {
      const card = await issue.mutateAsync({ accountId: v.accountId, cardType: v.cardType, key: key.current });
      key.current = null;
      toast.success("Sandbox card created. Activate it to start using it.");
      onCreated(card);
      onClose();
    } catch (e) { reportCardError(e, "The card could not be created."); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !issue.isPending) onClose(); }}>
      <DialogContent side={mobile ? "bottom" : "center"} className="overflow-y-auto p-6 sm:max-w-lg">
        <DialogTitle className="pr-8">Create virtual card</DialogTitle>
        <DialogDescription className="mt-1.5">Issue a sandbox card linked to one of your accounts.</DialogDescription>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-5">
          <div>
            <Label htmlFor="card-account">Linked account</Label>
            <Controller control={control} name="accountId" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="card-account" className="mt-1.5" aria-invalid={Boolean(errors.accountId)}><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.displayName} · {a.maskedNumber}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.accountId && <p role="alert" className="mt-1.5 text-[13px] font-medium">{errors.accountId.message}</p>}
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Card type</legend>
            <Controller control={control} name="cardType" render={({ field }) => (
              <div role="radiogroup" aria-label="Card type" className="mt-1.5 grid grid-cols-2 gap-3">
                {TYPES.map(t => (
                  <button key={t.value} type="button" role="radio" aria-checked={field.value === t.value} onClick={() => field.onChange(t.value)}
                    className={cn("rounded-xl border p-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring", field.value === t.value ? "border-foreground bg-muted" : "border-input")}>
                    <span className="block text-sm font-medium">{t.name}</span><span className="text-xs text-muted-foreground">{t.blurb}</span>
                  </button>
                ))}
              </div>
            )} />
          </fieldset>

          <section aria-label="Default limits and conditions" className="rounded-xl bg-muted p-4 text-sm">
            <h3 className="font-medium">Default limits</h3>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 text-muted-foreground">
              <dt>Daily</dt><dd className="num text-foreground">{money(CARD_DEFAULT_LIMITS.dailyMinor)}</dd>
              <dt>Monthly</dt><dd className="num text-foreground">{money(CARD_DEFAULT_LIMITS.monthlyMinor)}</dd>
              <dt>Single transaction</dt><dd className="num text-foreground">{money(CARD_DEFAULT_LIMITS.singleMinor)}</dd>
            </dl>
            <ul className="mt-3 space-y-1 text-[13px] text-muted-foreground">
              <li>The card starts inactive and must be activated.</li>
              <li>Limits can be changed after creation, within sandbox maximums.</li>
              <li>You can hold up to 5 sandbox cards.</li>
            </ul>
          </section>

          <p className="flex items-start gap-2 text-[13px] text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>This is a development sandbox card. It has no card number, can’t be used at real merchants or ATMs, and doesn’t hold or move money.</span></p>

          <div>
            <Controller control={control} name="acknowledged" render={({ field }) => (
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} aria-invalid={Boolean(errors.acknowledged)} className="mt-0.5 size-5 shrink-0 accent-foreground" />
                <span>I understand this is a sandbox card for testing only.</span>
              </label>
            )} />
            {errors.acknowledged && <p role="alert" className="mt-1.5 text-[13px] font-medium">{errors.acknowledged.message}</p>}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={issue.isPending} className="max-sm:h-12 max-sm:w-full">Cancel</Button>
            <Button type="submit" loading={issue.isPending} className="max-sm:h-12 max-sm:w-full">Issue sandbox card</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
