"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { LogIn, RefreshCw, ServerOff, TriangleAlert } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";
import { EmptyState } from "@/components/banking/empty-state";
import { ErrorState } from "@/components/banking/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useHistory, useMarketStream, useQuotes } from "@/hooks/use-market";
import { dateTimeLondon } from "@/lib/utils/format";
import { useAuth } from "@/providers/auth-provider";
import { WATCHLIST, type HistoryRange } from "@/types/market";
import { ExternalStockLink, Monogram, WatchlistCard } from "./watchlist-card";

const StockChart = dynamic(() => import("./stock-chart"), { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> });
const RANGES: HistoryRange[] = ["1D", "1W", "1M", "3M", "1Y"];

/** Segmented control for the chart range: a radio group (no tab panels), arrow-key navigable, with an animated pill. */
function RangeSelector({ value, onChange }: { value: HistoryRange; onChange: (r: HistoryRange) => void }) {
  const move = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = RANGES[(i + d + RANGES.length) % RANGES.length]!;
    onChange(next);
    (e.currentTarget.parentElement?.children[(i + d + RANGES.length) % RANGES.length] as HTMLElement | undefined)?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Chart range" className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1">
      {RANGES.map((r, i) => (
        <button key={r} type="button" role="radio" aria-checked={value === r} tabIndex={value === r ? 0 : -1} onClick={() => onChange(r)} onKeyDown={e => move(e, i)}
          className={cn("relative inline-flex h-7 min-w-10 items-center justify-center rounded-md px-2.5 text-[13px] font-medium transition-colors", value === r ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
          {value === r && <motion.span layoutId="range-pill" className="absolute inset-0 rounded-md bg-card shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span className="relative">{r}</span>
        </button>
      ))}
    </div>
  );
}

export function SignInForMarket() {
  const { signIn, loading } = useAuth();
  return <EmptyState icon={LogIn} title="Sign in to see market data" description="Quotes come from a live market data provider through your authenticated FINIX session. No sample prices are shown." action={<Button onClick={() => void signIn()} disabled={loading}>Sign in</Button>} />;
}

export function MarketSection() {
  const { user, loading: authLoading } = useAuth();
  const stream = useMarketStream();
  const quotes = useQuotes();
  const [symbol, setSymbol] = useState<string>(WATCHLIST[0].symbol);
  const [range, setRange] = useState<HistoryRange>("1M");
  const history = useHistory(symbol, range);

  if (authLoading) return <Skeleton className="h-64 w-full" />;
  if (!user) return <Card><SignInForMarket /></Card>;
  if (quotes.isPending) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{WATCHLIST.map(w => <Skeleton key={w.symbol} className="h-72 rounded-xl" />)}</div>;
  if (quotes.error) return <ErrorState message={quotes.error.message} onRetry={() => void quotes.refetch()} retrying={quotes.isFetching} />;

  const { quotes: list, errors, fx } = quotes.data;
  const notConfigured = errors.length > 0 && errors.every(e => e.code === "NOT_CONFIGURED");
  if (notConfigured) return <Card><EmptyState icon={ServerOff} title="Market data isn’t configured" description="Set TWELVE_DATA_API_KEY in the backend environment and restart the API. Prices are never shown without a real provider." /></Card>;
  const limited = errors.find(e => e.code === "RATE_LIMITED");
  const selectedQuote = list.find(q => q.symbol === symbol);
  const meta = WATCHLIST.find(w => w.symbol === symbol)!;
  const currency = selectedQuote?.currency ?? history.data?.currency ?? "USD";

  return (
    <RevealGroup className="space-y-5">
      {limited && <p role="status" className="flex items-start gap-2.5 rounded-xl border border-dashed border-foreground/40 bg-muted px-4 py-3 text-sm"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{limited.message}</p>}
      <RevealItem className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {WATCHLIST.map(w => <WatchlistCard key={w.symbol} quote={list.find(q => q.symbol === w.symbol)} error={errors.find(e => e.symbol === w.symbol)} fx={fx} selected={symbol === w.symbol} onSelect={() => setSymbol(w.symbol)} />)}
      </RevealItem>
      <RevealItem>
        <Card>
          <CardHeader className="flex-wrap">
            <div className="flex min-w-0 items-center gap-3"><Monogram symbol={meta.symbol} className="size-10" /><div><CardTitle>{meta.name} <span className="font-normal text-muted-foreground">{meta.symbol}</span></CardTitle><CardDescription>Price in {currency} (native quote currency){history.data?.stale ? " · last saved data" : ""}</CardDescription></div></div>
            <div className="flex items-center gap-1.5">
              <ExternalStockLink name={meta.name} url={meta.url} />
              <RangeSelector value={range} onChange={setRange} />
            </div>
          </CardHeader>
          <CardContent>
            {history.isPending ? <Skeleton className="h-[300px]" />
              : history.error ? <ErrorState message={history.error.message} onRetry={() => void history.refetch()} retrying={history.isFetching} />
              : history.data.points.length === 0 ? <EmptyState icon={TriangleAlert} title="No price history" description="The provider returned no data for this range." className="py-10" />
              : <StockChart history={history.data} />}
          </CardContent>
        </Card>
      </RevealItem>
      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        Prices are US-listed quotes in their native currency (USD). GBP figures are indicative conversions using {fx?.rate ? <>a real {fx.pair} rate of {Number(fx.rate).toFixed(4)} from {fx.source} at {dateTimeLondon(fx.rateTimestamp!)}</> : "an exchange rate that is currently unavailable"}, not executable prices.
        {" "}Data refreshes about every minute{stream === "live" ? " and updates are streamed to this page" : ""}. Labels show whether each quote is live, delayed or end-of-day.
        {" "}<button className="inline-flex items-center gap-1 underline underline-offset-2" onClick={() => void quotes.refetch()}><RefreshCw className={quotes.isFetching ? "size-3 animate-spin" : "size-3"} />Refresh</button>
      </p>
    </RevealGroup>
  );
}
