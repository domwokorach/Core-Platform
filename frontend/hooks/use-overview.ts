"use client";

import { useMemo } from "react";
import { useDashboard, useTransfers } from "@/hooks/use-banking";
import { balanceSeries, cashflow, inRange, spendingByMerchant, transferRefs } from "@/lib/utils/analytics";
import { useFilters } from "@/providers/filters-provider";

/** Everything the dashboard/analytics views derive from the authoritative dashboard payload + transfers. */
export function useOverview() {
  const dash = useDashboard();
  const transfers = useTransfers();
  const { range } = useFilters();
  const d = dash.data;
  const refs = useMemo(() => transferRefs(transfers.data ?? []), [transfers.data]);

  const derived = useMemo(() => {
    if (!d) return null;
    const scoped = inRange(d.transactions, range);
    const trend = balanceSeries(d.totalBalanceMinor, d.transactions, range);
    const start = trend[0]?.balanceMinor ?? d.totalBalanceMinor;
    const changeMinor = d.totalBalanceMinor - start;
    const changePct = start ? (changeMinor / Math.abs(start)) * 100 : 0;
    const slices = spendingByMerchant(scoped, refs);
    return {
      trend, changeMinor, changePct, slices,
      spentInRange: slices.reduce((s, x) => s + x.valueMinor, 0),
      flow: cashflow(d.transactions, refs, range),
    };
  }, [d, range, refs]);

  return { ...dash, data: d, derived, refs, transfers: transfers.data ?? [] };
}
