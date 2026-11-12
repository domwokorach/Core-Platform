"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowDownToLine, ArrowUpFromLine, Layers, Receipt, TrendingUp } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";
import { ErrorState } from "@/components/banking/error-state";
import { EmptyState } from "@/components/banking/empty-state";
import { TransferFlow } from "@/components/banking/transfer-flow";
import { BalanceTrendChart, CashflowChart, SpendingDonut } from "@/components/charts/lazy";
import { TransactionDrawer } from "@/components/transactions/transaction-drawer";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivity, type Row } from "@/hooks/use-activity";
import { useOverview } from "@/hooks/use-overview";
import { money } from "@/lib/utils/format";
import { AccountsCarousel } from "./accounts-carousel";
import { HeroBalance } from "./hero-balance";
import { KpiCard } from "./kpi-card";
import { InsightsCard } from "./insights-card";
import { GoalsPanel } from "./preview-cards";
import { WatchlistCompact } from "@/components/market/watchlist-compact";

export function DashboardView() {
  const { data, derived, isLoading, error, refetch, isFetching } = useOverview();
  const { rows } = useActivity();
  const [selected, setSelected] = useState<Row | null>(null);

  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} retrying={isFetching} />;
  const c = data?.currency ?? "GBP";
  const loading = isLoading || !data || !derived;

  return (
    <RevealGroup className="grid grid-cols-12 gap-4 sm:gap-5">
      <RevealItem className="col-span-12 xl:col-span-8"><HeroBalance data={data} loading={loading} changeMinor={derived?.changeMinor ?? 0} changePct={derived?.changePct ?? 0} trend={derived?.trend ?? []} /></RevealItem>
      <RevealItem className="col-span-12 xl:col-span-4"><AccountsCarousel data={data} loading={loading} /></RevealItem>

      <RevealItem className="col-span-12 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        {loading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[8.5rem] rounded-xl" />) : <>
          <KpiCard label="Monthly income" value={money(data.monthlyIncomeMinor, c)} icon={ArrowDownToLine} tone="income" hint="This calendar month" />
          <KpiCard label="Monthly spending" value={money(data.monthlySpendingMinor, c)} icon={ArrowUpFromLine} tone="expense" hint="This calendar month" />
          <KpiCard label="Net balance change" value={`${derived.changeMinor < 0 ? "−" : ""}${money(Math.abs(derived.changeMinor), c)}`} icon={TrendingUp} tone="profit" delta={derived.changePct} hint="Selected range" />
          <KpiCard label="Accounts" value={String(data.accounts.length)} icon={Layers} tone="brand" hint="All active" />
        </>}
      </RevealItem>

      <RevealItem className="col-span-12 xl:col-span-8">
        <Card className="h-full">
          <CardHeader><div><CardTitle>Balance trend</CardTitle><CardDescription>Daily closing balance from posted ledger entries</CardDescription></div></CardHeader>
          <CardContent>{loading ? <Skeleton className="h-[280px]" /> : <BalanceTrendChart data={derived.trend} />}</CardContent>
        </Card>
      </RevealItem>
      <RevealItem className="col-span-12 xl:col-span-4">
        <Card className="h-full">
          <CardHeader><div><CardTitle>Spending by merchant</CardTitle><CardDescription>Selected range, excl. transfers</CardDescription></div></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-44" /> : derived.slices.length ? <div className="xl:[&>figure]:flex-col"><SpendingDonut data={derived.slices} total={derived.spentInRange} /></div>
              : <EmptyState icon={Receipt} title="No spending in this range" description="Choose a wider date range to see where your money goes." className="py-8" />}
          </CardContent>
        </Card>
      </RevealItem>

      <RevealItem className="col-span-12"><InsightsCard /></RevealItem>

      <RevealItem className="col-span-12 xl:col-span-8">
        <Card className="h-full">
          <CardHeader><div><CardTitle>Recent activity</CardTitle><CardDescription>Latest posted entries</CardDescription></div><Button asChild variant="ghost" size="sm"><Link href="/transactions">View all<ArrowRight /></Link></Button></CardHeader>
          <CardContent className="px-3 sm:px-4">
            {loading ? <div className="space-y-4 p-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
              : rows.length ? <TransactionList rows={rows.slice(0, 5)} onSelect={setSelected} />
              : <EmptyState icon={Receipt} title="Nothing here yet" description="Activity in the selected range will appear here." className="py-8" />}
          </CardContent>
        </Card>
      </RevealItem>
      <RevealItem className="col-span-12 xl:col-span-4">
        <Card className="h-full">
          <CardHeader><div><CardTitle>Quick transfer</CardTitle><CardDescription>Between your own accounts</CardDescription></div></CardHeader>
          <CardContent><TransferFlow /></CardContent>
        </Card>
      </RevealItem>

      <RevealItem className="col-span-12 xl:col-span-8">
        <Card className="h-full">
          <CardHeader><div><CardTitle>Income vs spending</CardTitle><CardDescription>Excludes transfers between your own accounts</CardDescription></div></CardHeader>
          <CardContent>{loading ? <Skeleton className="h-[260px]" /> : <CashflowChart data={derived.flow} />}</CardContent>
        </Card>
      </RevealItem>
      <RevealItem className="col-span-12 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:col-span-4 xl:grid-cols-1"><GoalsPanel /><WatchlistCompact /></RevealItem>

      <TransactionDrawer tx={selected} onClose={() => setSelected(null)} />
    </RevealGroup>
  );
}
