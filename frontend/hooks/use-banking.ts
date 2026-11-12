"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, createTransfer, getAccounts, getDashboard, getTransactions, getTransfers, type TransferPayload } from "@/lib/api/client";
import { demoDashboard, demoTransfers } from "@/lib/demo-data";
import { useAuth } from "@/providers/auth-provider";

/** Shared auth-aware query wrapper. Signed out → fictional demo data (flagged `isDemo`), never presented as live. */
export function useBankingQuery<T>(key: string, fetcher: (token: string) => Promise<T>, demo: T) {
  const { user, loading: authLoading, getToken, endSession } = useAuth();
  const sub = user?.profile.sub;
  const query = useQuery({
    queryKey: ["banking", key, sub],
    enabled: Boolean(user),
    queryFn: () => {
      const token = getToken();
      if (!token) throw new ApiError("Your session has expired. Sign in again.", 401);
      return fetcher(token);
    },
  });
  useEffect(() => {
    // 401: the API rejected our token, so the session is over. 403 (not authorised) must NOT sign out:
    // silent SSO would just sign the same user straight back in and loop.
    if (query.error instanceof ApiError && query.error.status === 401) endSession();
  }, [query.error, endSession]);
  // Demo data only once we KNOW nobody is signed in; while the session is being restored show loading state, never fake balances.
  const isDemo = !user && !authLoading;
  return {
    data: isDemo ? demo : user ? query.data : undefined,
    isDemo,
    isLoading: authLoading || (!isDemo && query.isPending),
    isFetching: query.isFetching,
    error: isDemo ? null : query.error,
    refetch: query.refetch,
  };
}

export const useDashboard = () => useBankingQuery("dashboard", getDashboard, demoDashboard);
export const useAccounts = () => useBankingQuery("accounts", getAccounts, demoDashboard.accounts);
export const useTransactions = () => useBankingQuery("transactions", getTransactions, demoDashboard.transactions);
export const useTransfers = () => useBankingQuery("transfers", getTransfers, demoTransfers);

/**
 * Posts a transfer. The idempotency key is stable across retries of the same details so a retry after a network
 * failure can never double-post; success is only reported once the API returns a committed receipt.
 */
export function useCreateTransfer() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, key }: { payload: TransferPayload; key: string }) => {
      const token = getToken();
      if (!token) throw new ApiError("Your session has expired. Sign in again.", 401);
      return createTransfer(token, payload, key);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banking"] }),
  });
}
