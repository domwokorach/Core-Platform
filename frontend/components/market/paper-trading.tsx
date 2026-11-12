"use client";

import { useRef, useState } from "react";
import { FlaskConical, Plus, ServerOff, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/banking/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-media";
import { usePaperAccount, usePaperOrders, usePaperPositions, usePaperStatus, useSubmitPaperOrder } from "@/hooks/use-market";
import { cn } from "@/lib/utils";
import { dateTimeLondon, formatPrice, formatSigned } from "@/lib/utils/format";
import { useAuth } from "@/providers/auth-provider";
import { WATCHLIST } from "@/types/market";

const NOTICE = "Simulated paper trading. No real money moves, orders never reach a live brokerage, and nothing here is connected to your FINIX accounts or ledger.";

function Pl({ value, pct }: { value: string; pct: string }) {
  const n = Number(value);
  return <span data-accent className={cn("num font-medium", n > 0 ? "text-income-text" : n < 0 ? "text-expense-text" : "text-muted-foreground")}>{n > 0 ? "▲" : n < 0 ? "▼" : ""} {formatSigned(value)} ({formatSigned(Number(pct) * 100)}%)</span>;
}

export function PaperTrading() {
  const { user } = useAuth();
  const status = usePaperStatus();
  const enabled = Boolean(status.data?.enabled);
  const account = usePaperAccount(enabled), positions = usePaperPositions(enabled), orders = usePaperOrders(enabled);
  const [open, setOpen] = useState(false);

  if (!user) return null;
  const header = (
    <CardHeader className="flex-wrap">
      <div className="min-w-0 flex-1"><CardTitle className="flex flex-wrap items-center gap-2">Paper trading <Badge tone="danger">PAPER · SIMULATED</Badge></CardTitle><CardDescription>{NOTICE}</CardDescription></div>
      {enabled && <Button onClick={() => setOpen(true)}><Plus />New order</Button>}
    </CardHeader>
  );
  if (status.isPending) return <Card>{header}<CardContent><Skeleton className="h-32" /></CardContent></Card>;
  if (!enabled) return <Card>{header}<CardContent><EmptyState icon={ServerOff} title="Paper trading isn’t configured" description="Set ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY (paper keys) on the backend to enable the simulated portfolio." className="py-8" /></CardContent></Card>;

  return (
    <Card>
      {header}
      <CardContent className="space-y-6">
        {account.error ? <p role="alert" className="flex items-center gap-2 text-sm"><TriangleAlert className="size-4" />{account.error.message}</p>
          : <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([["Cash", account.data?.data.cash], ["Equity", account.data?.data.equity], ["Buying power", account.data?.data.buyingPower]] as const).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="num mt-1 text-base font-semibold">{v === undefined ? <Skeleton className="h-5 w-20" /> : formatPrice(v, account.data!.data.currency)}</dd></div>
              ))}
              <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Account</dt><dd className="mt-1 text-base font-semibold">{account.data?.data.status ?? "…"}</dd></div>
            </dl>}

        <section aria-labelledby="pos-h">
          <h3 id="pos-h" className="mb-2 text-sm font-semibold">Simulated positions</h3>
          {positions.isPending ? <Skeleton className="h-16" /> : positions.error ? <p role="alert" className="text-sm text-muted-foreground">{positions.error.message}</p>
            : positions.data.data.length === 0 ? <p className="text-sm text-muted-foreground">No simulated positions yet.</p>
            : <Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>Symbol</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Avg entry</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">P/L</TableHead></TableRow></TableHeader>
                <TableBody>{positions.data.data.map(p => <TableRow key={p.symbol}><TableCell className="font-medium">{p.symbol}</TableCell><TableCell className="num text-right">{p.qty}</TableCell><TableCell className="num text-right">{formatPrice(p.avgEntryPrice, "USD")}</TableCell><TableCell className="num text-right">{formatPrice(p.currentPrice, "USD")}</TableCell><TableCell className="text-right"><Pl value={p.unrealizedPl} pct={p.unrealizedPlpc} /></TableCell></TableRow>)}</TableBody></Table>}
        </section>

        <section aria-labelledby="ord-h">
          <h3 id="ord-h" className="mb-2 text-sm font-semibold">Submitted orders</h3>
          {orders.isPending ? <Skeleton className="h-16" /> : orders.error ? <p role="alert" className="text-sm text-muted-foreground">{orders.error.message}</p>
            : orders.data.data.length === 0 ? <p className="text-sm text-muted-foreground">No paper orders yet.</p>
            : <ul className="divide-y">{orders.data.data.slice(0, 8).map(o => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                  <Badge tone={o.side === "buy" ? "brand" : "neutral"}>{o.side.toUpperCase()}</Badge>
                  <span className="font-medium">{o.qty} × {o.symbol}</span>
                  <Badge tone={o.status === "filled" ? "success" : o.status === "rejected" || o.status === "canceled" ? "danger" : "warning"}>{o.status.replace(/_/g, " ")}</Badge>
                  <span className="num ml-auto text-xs text-muted-foreground">{o.filledAvgPrice ? `filled @ ${formatPrice(o.filledAvgPrice, "USD")} · ` : ""}{o.submittedAt ? dateTimeLondon(o.submittedAt) : ""}</span>
                </li>))}</ul>}
        </section>
      </CardContent>
      <OrderDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function OrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const mobile = useIsMobile();
  const submit = useSubmitPaperOrder();
  const [symbol, setSymbol] = useState<string>(WATCHLIST[0].symbol);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("1");
  const [review, setReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef<string | null>(null);
  const n = Number(qty);
  const valid = /^\d+$/.test(qty) && n >= 1 && n <= 100;
  const reset = (o: boolean) => { if (!submit.isPending) { onOpenChange(o); if (!o) { setReview(false); setError(null); key.current = null; } } };
  const change = <T,>(set: (v: T) => void) => (v: T) => { key.current = null; setError(null); set(v); };

  const send = async () => {
    key.current ??= crypto.randomUUID();
    try {
      const r = await submit.mutateAsync({ key: key.current, body: { symbol, side, qty: n } });
      toast.success(`Paper order ${r.data.status.replace(/_/g, " ")}`, { description: `${side.toUpperCase()} ${n} × ${symbol} (simulated)` });
      key.current = null; reset(false);
    } catch (e) { setError(e instanceof Error ? e.message : "The paper order could not be submitted."); }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent side={mobile ? "bottom" : "center"} className="p-6">
        <DialogTitle className="flex items-center gap-2"><FlaskConical className="size-5" />Paper order</DialogTitle>
        <DialogDescription className="mt-1"><strong className="text-foreground">PAPER TRADING.</strong> {NOTICE}</DialogDescription>
        {!review ? (
          <form className="mt-5 space-y-4" onSubmit={e => { e.preventDefault(); if (valid) setReview(true); }}>
            <div role="radiogroup" aria-label="Side" className="grid grid-cols-2 gap-2">
              {(["buy", "sell"] as const).map(s => <button key={s} type="button" role="radio" aria-checked={side === s} onClick={() => change(setSide)(s)} className={cn("h-11 rounded-lg border text-sm font-medium transition-colors", side === s ? "border-foreground bg-primary text-primary-foreground" : "hover:bg-muted")}>{s === "buy" ? "Buy" : "Sell"}</button>)}
            </div>
            <div><Label htmlFor="paper-symbol">Stock</Label>
              <Select value={symbol} onValueChange={change(setSymbol)}><SelectTrigger id="paper-symbol" className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{WATCHLIST.map(w => <SelectItem key={w.symbol} value={w.symbol}>{w.symbol} · {w.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label htmlFor="paper-qty">Shares (whole, 1–100)</Label>
              <Input id="paper-qty" inputMode="numeric" className="num mt-1.5" value={qty} aria-invalid={!valid} aria-describedby={valid ? undefined : "paper-qty-err"} onChange={e => change(setQty)(e.target.value)} />
              {!valid && <p id="paper-qty-err" role="alert" className="mt-1.5 text-[13px]">Enter a whole number from 1 to 100.</p>}</div>
            <p className="text-xs text-muted-foreground">Market order, day. Executes against the simulated Alpaca paper account only.</p>
            <Button type="submit" size="lg" className="w-full" disabled={!valid}>Review order</Button>
          </form>
        ) : (
          <div className="mt-5">
            <dl className="space-y-3 rounded-xl bg-muted/60 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Order</dt><dd className="font-semibold">{side.toUpperCase()} {n} × {symbol}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Type</dt><dd>Market · day</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Mode</dt><dd><Badge tone="danger">PAPER · SIMULATED</Badge></dd></div>
            </dl>
            {error && <p role="alert" className="mt-4 flex gap-2 rounded-lg border-2 border-foreground/70 p-3 text-sm"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setReview(false)} disabled={submit.isPending}>Back</Button>
              <Button onClick={() => void send()} loading={submit.isPending}>{error ? "Try again" : "Submit paper order"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
