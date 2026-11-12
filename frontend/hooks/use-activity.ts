"use client";

import { useMemo } from "react";
import { useDashboard, useTransactions, useTransfers } from "@/hooks/use-banking";
import { classify, inRange, transferRefs, type TxKind } from "@/lib/utils/analytics";
import { useFilters } from "@/providers/filters-provider";
import type { Transaction } from "@/types/banking";

export interface Row extends Transaction { kind: TxKind; accountName: string }

/** Ledger entries enriched with kind + account name, filtered by the global date range and search. */
export function useActivity() {
  const tx = useTransactions();
  const accounts = useDashboard();
  const transfers = useTransfers();
  const { range, search } = useFilters();
  const refs = useMemo(() => transferRefs(transfers.data ?? []), [transfers.data]);
  const names = useMemo(() => new Map((accounts.data?.accounts ?? []).map(a => [a.id, `${a.displayName} ${a.maskedNumber}`])), [accounts.data]);

  const all = useMemo<Row[]>(() => (tx.data ?? []).map(t => ({ ...t, kind: classify(t, refs), accountName: names.get(t.accountId) ?? "Account" })), [tx.data, refs, names]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inRange(all, range).filter(r => !q || `${r.description} ${r.merchant?.name ?? ""} ${r.merchant?.category ?? ""} ${r.reference} ${r.accountName}`.toLowerCase().includes(q));
  }, [all, range, search]);

  return {
    all, rows, refs, accounts: accounts.data?.accounts ?? [], isDemo: tx.isDemo,
    isLoading: tx.isLoading, error: tx.error, refetch: tx.refetch, isFetching: tx.isFetching,
  };
}
