"use client";

import { ArrowDownRight, ArrowUpRight, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { money, percent } from "@/lib/utils/format";
import { useFilters } from "@/providers/filters-provider";
import type { Dashboard } from "@/types/banking";
import type { TrendPoint } from "@/lib/utils/analytics";

const RANGE_LABEL = { "7d": "last 7 days", "30d": "last 30 days", "90d": "last 90 days", all: "loaded activity" } as const;

function Spark({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) return null;
  const vals = data.map(d => d.balanceMinor), min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${34 - ((d.balanceMinor - min) / span) * 30}`).join(" ");
  return <svg aria-hidden viewBox="0 0 100 36" preserveAspectRatio="none" className="h-14 w-full"><polyline points={pts} fill="none" stroke="#ffffff" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

export function HeroBalance({ data, changeMinor, changePct, trend, loading }: { data?: Dashboard; changeMinor: number; changePct: number; trend: TrendPoint[]; loading?: boolean }) {
  const { range } = useFilters();
  const up = changeMinor >= 0;
  return (
    <section aria-labelledby="hero-title" className="hero-balance ring-1 ring-white/10 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-2xl p-6 text-white shadow-lift sm:p-8">
      <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-72 opacity-[0.08]" viewBox="0 0 200 200"><circle cx="100" cy="100" r="98" fill="none" stroke="#fff" /><circle cx="100" cy="100" r="68" fill="none" stroke="#fff" /><circle cx="100" cy="100" r="38" fill="none" stroke="#fff" /></svg>
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="hero-title" className="text-[13px] font-medium text-white/70">Total balance</h2>
          {loading || !data ? <Skeleton className="mt-3 h-11 w-60 bg-white/15" /> : <p className="num mt-2 text-[2.25rem] font-semibold leading-none tracking-tight sm:text-[2.75rem]">{money(data.totalBalanceMinor, data.currency)}</p>}
          {!loading && data && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/75">
              <span data-accent className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-white/10 ${up ? "text-[#34d399]" : "text-[#f87171]"}`}>
                {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}<span className="num">{percent(changePct)}</span>
              </span>
              <span className="num">{up ? "+" : "−"}{money(Math.abs(changeMinor), data.currency)}</span> over {RANGE_LABEL[range]}
            </p>
          )}
        </div>
        <Button asChild variant="secondary" className="bg-white/10 text-white hover:bg-white/20"><Link href="/transfers"><Send />Transfer</Link></Button>
      </div>
      <div className="relative grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <div><p className="text-xs text-white/60">Available</p>{data ? <p className="num mt-1 text-lg font-semibold">{money(data.totalBalanceMinor, data.currency)}</p> : <Skeleton className="mt-1 h-6 w-24 bg-white/15" />}<p className="mt-0.5 text-[11px] text-white/50">No holds on ledger</p></div>
        <div><p className="text-xs text-white/60">Accounts</p><p className="num mt-1 text-lg font-semibold">{data?.accounts.length ?? "–"}</p></div>
        <div className="col-span-2 sm:col-span-1"><Spark data={trend} /></div>
      </div>
    </section>
  );
}
