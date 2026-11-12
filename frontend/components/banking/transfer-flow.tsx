"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckCircle2, Copy, LockKeyhole, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts, useCreateTransfer } from "@/hooks/use-banking";
import { useIsMobile } from "@/hooks/use-media";
import { ApiError } from "@/lib/api/client";
import { transferSchema, type TransferValues } from "@/lib/schemas";
import { dateLong, money, toMinor } from "@/lib/utils/format";
import { useAuth } from "@/providers/auth-provider";
import type { Account, TransferReceipt } from "@/types/banking";

const label = (a: Account) => `${a.displayName} ${a.maskedNumber}`;

function FieldError({ id, message }: { id: string; message?: string }) {
  return <AnimatePresence>{message && <motion.p id={id} role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="mt-1.5 flex items-center gap-1.5 text-[13px] text-destructive-text"><TriangleAlert className="size-3.5" />{message}</motion.p>}</AnimatePresence>;
}

export function TransferFlow() {
  const { user, signIn } = useAuth();
  const { data: accounts = [], isLoading } = useAccounts();
  const mutation = useCreateTransfer();
  const mobile = useIsMobile();
  const [confirming, setConfirming] = useState<TransferValues | null>(null);
  const [receipt, setReceipt] = useState<TransferReceipt | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  // One idempotency key per distinct set of details; retries reuse it so a network hiccup can never double-post.
  const key = useRef<string | null>(null);

  const form = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    mode: "onBlur",
    defaultValues: { sourceAccountId: "", destinationAccountId: "", amount: "", description: "" },
  });
  const { control, register, handleSubmit, watch, setValue, reset, formState: { errors } } = form;

  useEffect(() => {
    if (accounts.length < 2) return;
    if (!accounts.some(a => a.id === form.getValues("sourceAccountId"))) setValue("sourceAccountId", accounts[0]!.id);
    if (!accounts.some(a => a.id === form.getValues("destinationAccountId"))) setValue("destinationAccountId", accounts[1]!.id);
  }, [accounts, form, setValue]);
  useEffect(() => { const sub = watch(() => { key.current = null; setServerError(null); }); return () => sub.unsubscribe(); }, [watch]);

  const vals = watch();
  const src = accounts.find(a => a.id === vals.sourceAccountId);
  const dst = accounts.find(a => a.id === vals.destinationAccountId);
  const insufficient = useMemo(() => Boolean(src && /^\d+(\.\d{1,2})?$/.test(vals.amount) && toMinor(vals.amount) > src.balanceMinor), [src, vals.amount]);

  const onReview = (v: TransferValues) => {
    if (!user) { toast.info("Sign in to move money between your accounts."); return; }
    setConfirming(v);
  };

  const confirm = async () => {
    if (!confirming) return;
    key.current ??= crypto.randomUUID();
    try {
      const r = await mutation.mutateAsync({ key: key.current, payload: { sourceAccountId: confirming.sourceAccountId, destinationAccountId: confirming.destinationAccountId, amountMinor: toMinor(confirming.amount), description: confirming.description } });
      // Only here — after the API returned a committed receipt — do we claim success.
      key.current = null;
      setReceipt(r);
      setConfirming(null);
      reset({ sourceAccountId: confirming.sourceAccountId, destinationAccountId: confirming.destinationAccountId, amount: "", description: "" });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setServerError(status === 409 ? "This transfer conflicts with an earlier request. Review your details and try again."
        : status === 401 || status === 403 ? "Your session is no longer valid. Please sign in again."
        : e instanceof Error ? e.message : "The transfer could not be completed. Nothing was moved.");
    }
  };

  const side = mobile ? "bottom" : "center";
  const closeDialog = (open: boolean) => { if (!open && !mutation.isPending) { setConfirming(null); setServerError(null); } };

  return (
    <>
      <form onSubmit={handleSubmit(onReview)} noValidate className="space-y-4" aria-describedby={user ? undefined : "demo-note"}>
        {(["sourceAccountId", "destinationAccountId"] as const).map(name => (
          <div key={name}>
            <Label htmlFor={name}>{name === "sourceAccountId" ? "From" : "To"}</Label>
            <Controller control={control} name={name} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isLoading || accounts.length < 2}>
                <SelectTrigger id={name} className="mt-1.5" aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-err` : undefined}><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{label(a)} · {money(a.balanceMinor, a.currency)}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            <FieldError id={`${name}-err`} message={errors[name]?.message} />
          </div>
        ))}
        <div>
          <Label htmlFor="amount">Amount (GBP)</Label>
          <div className="relative mt-1.5">
            <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
            <Input id="amount" inputMode="decimal" autoComplete="off" placeholder="0.00" className="num pl-8 text-lg font-medium sm:text-base" aria-invalid={Boolean(errors.amount) || insufficient} aria-describedby={errors.amount ? "amount-err" : insufficient ? "amount-warn" : undefined} {...register("amount")} />
          </div>
          <FieldError id="amount-err" message={errors.amount?.message} />
          {!errors.amount && insufficient && <p id="amount-warn" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-warning-text"><TriangleAlert className="size-3.5" />That’s more than the available {src && money(src.balanceMinor, src.currency)}.</p>}
        </div>
        <div>
          <Label htmlFor="description">Reference</Label>
          <Input id="description" maxLength={120} placeholder="e.g. Monthly savings" className="mt-1.5" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "description-err" : undefined} {...register("description")} />
          <FieldError id="description-err" message={errors.description?.message} />
        </div>
        <Button type="submit" size="lg" variant="brand" className="w-full" disabled={isLoading || (Boolean(user) && accounts.length < 2)}>
          {user ? "Review transfer" : "Sign in to transfer"}<ArrowRight />
        </Button>
        <p id="demo-note" className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" />{user ? "Posted atomically to the double-entry ledger" : "No funds move in demo mode"}</p>
        {!user && <button type="button" onClick={() => void signIn()} className="sr-only">Sign in</button>}
      </form>

      {/* Confirmation */}
      <Dialog open={Boolean(confirming)} onOpenChange={closeDialog}>
        <DialogContent side={side} className="gap-0 p-6" hideClose={mutation.isPending}>
          <DialogTitle>Confirm transfer</DialogTitle>
          <DialogDescription className="mt-1">Check the details. Transfers post immediately and can’t be undone.</DialogDescription>
          {confirming && src && dst && (
            <dl className="mt-5 space-y-3 rounded-xl bg-muted/60 p-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Amount</dt><dd className="num text-xl font-semibold">{money(toMinor(confirming.amount), src.currency)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">From</dt><dd className="text-right font-medium">{label(src)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">To</dt><dd className="text-right font-medium">{label(dst)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Reference</dt><dd className="break-words text-right font-medium">{confirming.description}</dd></div>
            </dl>
          )}
          <AnimatePresence>{serverError && <motion.p role="alert" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="mt-4 flex gap-2 rounded-lg bg-destructive-soft p-3 text-sm text-destructive-text"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{serverError}</motion.p>}</AnimatePresence>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => closeDialog(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button variant="brand" onClick={() => void confirm()} loading={mutation.isPending}>{serverError ? "Try again" : "Confirm & send"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt: rendered only from a committed API receipt */}
      <Dialog open={Boolean(receipt)} onOpenChange={o => !o && setReceipt(null)}>
        <DialogContent side={side} className="p-6">
          {receipt && <ReceiptView receipt={receipt} accounts={accounts} onDone={() => setReceipt(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReceiptView({ receipt, accounts, onDone }: { receipt: TransferReceipt; accounts: Account[]; onDone: () => void }) {
  const src = accounts.find(a => a.id === receipt.sourceAccountId);
  const dst = accounts.find(a => a.id === receipt.destinationAccountId);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success-text">
        <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.08 }}><CheckCircle2 className="size-8" /></motion.span>
      </div>
      <DialogTitle className="mt-4 text-center">Transfer complete</DialogTitle>
      <DialogDescription className="mt-1 text-center">Confirmed by the ledger and posted to both accounts.</DialogDescription>
      <p className="num mt-5 text-center text-4xl font-semibold tracking-tight">{money(receipt.amountMinor, receipt.currency)}</p>
      <dl className="mt-6 space-y-3 rounded-xl bg-muted/60 p-4 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">From</dt><dd className="text-right font-medium">{src ? label(src) : "Your account"}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">To</dt><dd className="text-right font-medium">{dst ? label(dst) : "Your account"}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Date</dt><dd className="text-right font-medium">{dateLong(receipt.createdAt)}</dd></div>
        <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">Reference</dt>
          <dd className="flex items-center gap-1.5 font-mono text-[13px] font-medium">{receipt.reference}
            <button aria-label="Copy reference" className="grid size-7 place-items-center rounded-md hover:bg-muted" onClick={() => { void navigator.clipboard?.writeText(receipt.reference); toast.success("Reference copied"); }}><Copy className="size-3.5" /></button>
          </dd></div>
      </dl>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" />Balances and history have been refreshed</p>
      <Button className="mt-5 w-full" onClick={onDone}>Done</Button>
    </motion.div>
  );
}
