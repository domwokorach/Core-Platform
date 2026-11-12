"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { openDashboardStream, type StreamState } from "@/lib/api/events";
import { getHistory, getPaperAccount, getPaperOrders, getPaperPositions, getPaperStatus, getQuotes, submitPaperOrder } from "@/lib/api/market";
import { useAuth } from "@/providers/auth-provider";
import type { HistoryRange } from "@/types/market";

function useAuthedQuery<T>(key: unknown[], fetcher: (token: string) => Promise<T>, opts: { enabled?: boolean; refetchInterval?: number; staleTime?: number } = {}) {
  const { user, getToken, endSession } = useAuth();
  const q = useQuery({
    queryKey: [...key, user?.profile.sub],
    enabled: Boolean(user) && (opts.enabled ?? true),
    refetchInterval: opts.refetchInterval,
    staleTime: opts.staleTime,
    queryFn: () => { const t = getToken(); if (!t) throw new ApiError("Your session has expired. Sign in again.", 401); return fetcher(t); },
  });
  useEffect(() => { if (q.error instanceof ApiError && q.error.status === 401) endSession(); }, [q.error, endSession]);
  return { ...q, signedIn: Boolean(user) };
}

/** Quotes poll every 60s while the tab is visible; the market SSE stream (when open) refreshes sooner. */
export const useQuotes = () => useAuthedQuery(["market", "quotes"], getQuotes, { refetchInterval: 60_000, staleTime: 20_000 });
export const useHistory = (symbol: string, range: HistoryRange) =>
  useAuthedQuery(["market", "history", symbol, range], t => getHistory(t, symbol, range), { staleTime: 60_000 });

/** Opens the authenticated market SSE stream while mounted; events only trigger a re-read of the REST endpoints. */
export function useMarketStream(): StreamState {
  const { user, getToken } = useAuth();
  const qc = useQueryClient();
  const [state, setState] = useState<StreamState>("idle");
  useEffect(() => {
    if (!user) { setState("idle"); return; }
    const refresh = () => qc.invalidateQueries({ queryKey: ["market"] });
    const close = openDashboardStream({ path: "/api/market/events", updatedEvent: "market.updated", getToken, onState: setState, onReady: () => {}, onUpdated: refresh });
    return () => { close(); setState("idle"); };
  }, [user, getToken, qc]);
  return state;
}

export const usePaperStatus = () => useAuthedQuery(["paper", "status"], getPaperStatus, { staleTime: 60_000 });
export const usePaperAccount = (enabled: boolean) => useAuthedQuery(["paper", "account"], getPaperAccount, { enabled, staleTime: 15_000 });
export const usePaperPositions = (enabled: boolean) => useAuthedQuery(["paper", "positions"], getPaperPositions, { enabled, staleTime: 15_000 });
export const usePaperOrders = (enabled: boolean) => useAuthedQuery(["paper", "orders"], getPaperOrders, { enabled, staleTime: 15_000 });

export function useSubmitPaperOrder() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, key }: { body: { symbol: string; side: "buy" | "sell"; qty: number }; key: string }) => {
      const t = getToken(); if (!t) throw new ApiError("Your session has expired. Sign in again.", 401);
      return submitPaperOrder(t, body, key);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paper"] }),
  });
}
