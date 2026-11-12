"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LimitSlider } from "./limit-slider";
import { useIsMobile } from "@/hooks/use-media";
import { reportCardError, useUpdateLimits } from "@/hooks/use-cards";
import { ApiError } from "@/lib/api/client";
import { CARD_LIMIT_MAX, cardLimitsSchema, type CardLimitsValues } from "@/lib/schemas";
import { money, toMinor } from "@/lib/utils/format";
import type { Card, CardLimits } from "@/types/cards";

const pounds = (minor: number) => (minor / 100).toFixed(2);
const FIELDS = [
  { name: "daily", label: "Daily limit", max: CARD_LIMIT_MAX.dailyMinor },
  { name: "monthly", label: "Monthly limit", max: CARD_LIMIT_MAX.monthlyMinor },
  { name: "single", label: "Single-transaction limit", max: CARD_LIMIT_MAX.singleMinor },
] as const;

export function LimitsDialog({ card, open, onClose }: { card: Card; open: boolean; onClose: () => void }) {
  const mobile = useIsMobile();
  const update = useUpdateLimits();
  const { register, control, handleSubmit, reset, setError, watch, setValue, formState: { errors } } = useForm<CardLimitsValues>({ resolver: zodResolver(cardLimitsSchema), mode: "onBlur" });
  useEffect(() => {
    if (open) reset({ daily: pounds(card.limits.dailyLimitMinor), monthly: pounds(card.limits.monthlyLimitMinor), single: pounds(card.limits.singleTransactionLimitMinor), onlineEnabled: card.limits.onlineEnabled });
  }, [open, card.limits, reset]);

  const onSubmit = async (v: CardLimitsValues) => {
    const next: CardLimits = { dailyLimitMinor: toMinor(v.daily), monthlyLimitMinor: toMinor(v.monthly), singleTransactionLimitMinor: toMinor(v.single), onlineEnabled: v.onlineEnabled };
    const changed = Object.fromEntries(Object.entries(next).filter(([k, val]) => card.limits[k as keyof CardLimits] !== val)) as Partial<CardLimits>;
    if (!Object.keys(changed).length) { onClose(); return; }
    try {
      await update.mutateAsync({ cardId: card.id, limits: changed });
      toast.success("Spending limits updated");
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) setError("root", { message: e.message }); // the server is the authority on limits
      else reportCardError(e, "Limits could not be updated.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !update.isPending) onClose(); }}>
      <DialogContent side={mobile ? "bottom" : "center"} className="overflow-y-auto p-6 sm:max-w-lg">
        <DialogTitle className="pr-8">Spending limits</DialogTitle>
        <DialogDescription className="mt-1.5">{card.linkedAccount.displayName} card · {card.maskedReference}</DialogDescription>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-4">
          {FIELDS.map(f => (
            <div key={f.name}>
              <Label htmlFor={`limit-${f.name}`}>{f.label} (GBP)</Label>
              <div className="relative mt-1.5">
                <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <Input id={`limit-${f.name}`} inputMode="decimal" autoComplete="off" className="num pl-8" aria-invalid={Boolean(errors[f.name])} aria-describedby={`limit-${f.name}-hint`} {...register(f.name)} />
              </div>
              <LimitSlider label={f.label} value={Number(watch(f.name))} max={Math.round(f.max / 100)}
                onChange={pounds => setValue(f.name, pounds.toFixed(2), { shouldDirty: true, shouldValidate: true })} />
              <p id={`limit-${f.name}-hint`} className={errors[f.name] ? "mt-1.5 text-[13px] font-medium" : "mt-1.5 text-xs text-muted-foreground"} role={errors[f.name] ? "alert" : undefined}>
                {errors[f.name]?.message ?? `Maximum ${money(f.max)}`}
              </p>
            </div>
          ))}
          <Controller control={control} name="onlineEnabled" render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-xl border p-3.5">
              <div><p id="online-label" className="text-sm font-medium">Online transactions</p><p className="text-xs text-muted-foreground">Allow sandbox card-not-present authorizations.</p></div>
              <button type="button" role="switch" aria-checked={field.value} aria-labelledby="online-label" onClick={() => field.onChange(!field.value)}
                className="relative h-7 w-12 shrink-0 rounded-full bg-input transition-colors focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-foreground">
                <span className="absolute left-0.5 top-0.5 grid size-6 place-items-center rounded-full bg-background text-[9px] font-semibold text-foreground shadow transition-transform" style={{ transform: field.value ? "translateX(20px)" : "none" }}>{field.value ? "On" : "Off"}</span>
              </button>
            </div>
          )} />
          {errors.root && <p role="alert" className="rounded-lg border-2 border-foreground/70 bg-muted px-3 py-2 text-[13px] font-medium">{errors.root.message}</p>}
          <p className="flex items-start gap-2 text-[13px] text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Card limits apply to sandbox card authorizations only. They don’t restrict internal transfers between your accounts.</span></p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending} className="max-sm:h-12 max-sm:w-full">Cancel</Button>
            <Button type="submit" loading={update.isPending} className="max-sm:h-12 max-sm:w-full">Save limits</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
