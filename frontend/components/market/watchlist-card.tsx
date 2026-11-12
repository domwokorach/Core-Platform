"use client";

import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Minus, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatGBP, formatPrice, formatSigned, timeLondon } from "@/lib/utils/format";
import { WATCHLIST, type FxInfo, type QuoteView, type SymbolError } from "@/types/market";
import { DataClassBadge, MarketStatusBadge } from "./market-badges";

/** Monogram tile: no logo service is licensed, so a neutral fallback is used. */
export function Monogram({ symbol, className }: { symbol: string; className?: string }) {
  return <span aria-hidden className={cn("grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-xs font-bold tracking-wide text-primary-foreground", className)}>{symbol.slice(0, 2)}</span>;
}

export function ExternalStockLink({ name, url, className }: { name: string; url: string; className?: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name} stock information on Nasdaq (opens in a new tab)`}
       className={cn("grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", className)}>
      <ExternalLink className="size-4" />
    </a>
  );
}

/** Green/red is reserved for price movement and always paired with an arrow and a signed number. */
export function Change({ change, pct, currency }: { change: string | null; pct: string | null; currency: string }) {
  if (change === null || pct === null) return <span className="text-sm text-muted-foreground">Change unavailable</span>;
  const n = Number(change);
  const Icon = n > 0 ? ArrowUpRight : n < 0 ? ArrowDownRight : Minus;
  return (
    <span data-accent className={cn("num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium", n > 0 ? "bg-income/12 text-income-text" : n < 0 ? "bg-expense/12 text-expense-text" : "bg-muted text-muted-foreground")}>
      <Icon className="size-3.5" aria-hidden />
      <span>{formatSigned(change)} {currency}</span><span aria-hidden>·</span><span>{formatSigned(pct)}%</span>
      <span className="sr-only">{n > 0 ? "up" : n < 0 ? "down" : "unchanged"} today</span>
    </span>
  );
}

export function WatchlistCard({ quote, error, fx, selected, onSelect }: { quote?: QuoteView; error?: SymbolError; fx: FxInfo | null; selected: boolean; onSelect: () => void }) {
  const meta = WATCHLIST.find(w => w.symbol === (quote?.symbol ?? error?.symbol))!;
  return (
    <motion.article whileHover={{ y: -2 }} transition={{ duration: 0.18 }} aria-label={`${meta.name} (${meta.symbol})`}>
      <Card className={cn("relative h-full transition-shadow duration-200 hover:shadow-lift", selected && "ring-2 ring-foreground")}>
        <ExternalStockLink name={meta.name} url={quote?.externalUrl ?? meta.url} className="absolute right-3 top-3 z-10" />
        <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={`Show ${meta.name} chart`} className="flex h-full w-full flex-col gap-4 rounded-xl p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex items-center gap-3 pr-9">
            <Monogram symbol={meta.symbol} />
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{meta.name}</span><span className="block text-xs text-muted-foreground">{meta.symbol} · {meta.exchange}</span></span>
          </span>

          {quote ? (
            <>
              <span>
                <span className="num block text-[1.75rem] font-semibold leading-none tracking-tight">{formatPrice(quote.price, quote.currency)}</span>
                <span className="mt-1 block text-xs text-muted-foreground">Native quote currency: {quote.currency}</span>
              </span>
              <Change change={quote.change} pct={quote.percentChange} currency={quote.currency} />
              <span className="flex flex-wrap gap-1.5"><MarketStatusBadge open={quote.marketOpen} /><DataClassBadge dataClass={quote.dataClass} /></span>
              {quote.gbp ? (
                <span className="rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="num font-medium text-foreground">≈ {formatGBP(Number(quote.gbp.price))}</span> <strong className="font-semibold text-foreground">indicative</strong> — not an executable price.
                  <span className="block">{quote.gbp.pair} {Number(quote.gbp.rate).toFixed(4)} · {quote.gbp.source} · {timeLondon(quote.gbp.rateTimestamp)}</span>
                </span>
              ) : fx?.error ? <span className="text-xs text-muted-foreground">GBP estimate unavailable: no exchange rate could be fetched.</span> : null}
              <span className="mt-auto text-xs text-muted-foreground">
                {quote.quotedAt ? <>Quote time {timeLondon(quote.quotedAt)}</> : "Quote time unavailable"} · {quote.source}
                {quote.stale && <span className="mt-1 flex items-start gap-1.5 font-medium text-foreground"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" />Provider unavailable. Showing the last saved quote.</span>}
              </span>
            </>
          ) : (
            <span role="status" className="flex flex-1 flex-col justify-center gap-1 rounded-lg border border-dashed p-4 text-sm">
              <span className="flex items-center gap-2 font-medium"><TriangleAlert className="size-4" />Price unavailable</span>
              <span className="text-muted-foreground">{error?.message}{error?.retryAfterSeconds ? ` Try again in about ${error.retryAfterSeconds}s.` : ""}</span>
            </span>
          )}
        </button>
      </Card>
    </motion.article>
  );
}
