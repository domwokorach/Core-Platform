"use client";

import { Receipt } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";
import { EmptyState } from "@/components/banking/empty-state";
import { ErrorState } from "@/components/banking/error-state";
import { BalanceTrendChart, CashflowChart, SpendingDonut } from "@/components/charts/lazy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { useOverview } from "@/hooks/use-overview";

export default function AnalyticsPage() {
  const { derived, isLoading, error, refetch, isFetching } = useOverview();
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} retrying={isFetching} />;
  return (
    <RevealGroup className="grid gap-5 lg:grid-cols-2">
      <RevealItem className="lg:col-span-2"><InsightsCard /></RevealItem>
      <RevealItem className="lg:col-span-2"><Card><CardHeader><div><CardTitle>Balance trend</CardTitle><CardDescription>Daily closing balance from posted ledger entries</CardDescription></div></CardHeader><CardContent>{!derived || isLoading ? <Skeleton className="h-[320px]" /> : <BalanceTrendChart data={derived.trend} height={320} />}</CardContent></Card></RevealItem>
      <RevealItem><Card className="h-full"><CardHeader><div><CardTitle>Income vs spending</CardTitle><CardDescription>Excludes own-account transfers</CardDescription></div></CardHeader><CardContent>{!derived || isLoading ? <Skeleton className="h-[260px]" /> : <CashflowChart data={derived.flow} />}</CardContent></Card></RevealItem>
      <RevealItem><Card className="h-full"><CardHeader><div><CardTitle>Spending by merchant</CardTitle><CardDescription>The ledger has no category field, so merchants are shown as recorded</CardDescription></div></CardHeader><CardContent>{!derived || isLoading ? <Skeleton className="h-44" /> : derived.slices.length ? <SpendingDonut data={derived.slices} total={derived.spentInRange} /> : <EmptyState icon={Receipt} title="No spending in this range" description="Choose a wider date range." className="py-8" />}</CardContent></Card></RevealItem>
    </RevealGroup>
  );
}
