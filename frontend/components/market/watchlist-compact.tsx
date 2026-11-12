"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuotes } from "@/hooks/use-market";
import { formatPrice } from "@/lib/utils/format";
import { useAuth } from "@/providers/auth-provider";
import { WATCHLIST } from "@/types/market";
import { DataClassBadge } from "./market-badges";
import { CompanyLogo } from "@/components/investments/company-logo";
import { Change } from "./watchlist-card";

/** Dashboard watchlist: real provider quotes only; signed-out or unavailable states show no prices. */
export function WatchlistCompact() {
  const { user } = useAuth();
  const q = useQuotes();
  return (
    <Card>
      <CardHeader><div><CardTitle>Watchlist</CardTitle><CardDescription>US stocks · Native USD prices</CardDescription></div><Button asChild variant="ghost" size="sm"><Link href="/investments">Open<ArrowRight /></Link></Button></CardHeader>
      <CardContent>
        {!user ? <p className="py-4 text-sm text-muted-foreground">Sign in to see market data. No sample prices are shown.</p>
          : q.isPending ? <div className="space-y-3">{WATCHLIST.map(w => <Skeleton key={w.symbol} className="h-12" />)}</div>
          : q.error ? <p role="alert" className="py-2 text-sm text-muted-foreground">Market data is unavailable right now. {q.error.message}</p>
          : <ul className="divide-y">{WATCHLIST.map((w, i) => {
              const quote = q.data.quotes.find(x => x.symbol === w.symbol);
              const err = q.data.errors.find(x => x.symbol === w.symbol);
              return (
                <motion.li key={w.symbol} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -1 }} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60">
                  <CompanyLogo symbol={w.symbol} name={w.name} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{w.name}</p><p className="text-xs text-muted-foreground">{w.symbol}</p></div>
                  {quote ? <div className="flex flex-col items-end gap-1"><span className="num text-sm font-semibold">{formatPrice(quote.price, quote.currency)}</span><span className="flex items-center gap-1.5"><Change change={quote.change} pct={quote.percentChange} currency="" /></span><DataClassBadge dataClass={quote.dataClass} /></div>
                    : <span className="text-xs text-muted-foreground">{err ? "Price unavailable" : "–"}</span>}
                </motion.li>
              );
            })}</ul>}
      </CardContent>
    </Card>
  );
}
