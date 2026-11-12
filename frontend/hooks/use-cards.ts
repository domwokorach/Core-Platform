"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ApiError, createCard, getCardActivity, getCards, getCardTransactions, runCardCommand, simulateCardAuthorization, updateCardLimits, type CardCommand,
} from "@/lib/api/client";
import { openDashboardStream, type StreamState } from "@/lib/api/events";
import { demoCardActivity, demoCards, demoCardTransactions } from "@/lib/demo-data";
import { getUserManager } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";
import { useBankingQuery } from "@/hooks/use-banking";
import type { CardLimits, CardType } from "@/types/cards";

export const useCards = () => useBankingQuery("cards", getCards, demoCards);
export const useCardTransactions = (cardId: string | undefined) =>
  useBankingQuery(`card-transactions:${cardId}`, t => (cardId ? getCardTransactions(t, cardId) : Promise.resolve([])), demoCardTransactions.filter(x => x.cardId === cardId));
export const useCardActivity = (cardId: string | undefined) =>
  useBankingQuery(`card-activity:${cardId}`, t => (cardId ? getCardActivity(t, cardId) : Promise.resolve([])), demoCardActivity.filter(x => x.cardId === cardId));

const isCardQuery = (key: readonly unknown[]) => typeof key[1] === "string" && key[1].startsWith("card");

/**
 * Live card updates. Events (`card.created`, `card.frozen`, …) are invalidation hints that carry no card details:
 * on every (re)connect and every event the card queries are re-read from the API.
 */
export function useCardsLive(): StreamState {
  const { user, getToken, endSession } = useAuth();
  const qc = useQueryClient();
  const [state, setState] = useState<StreamState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!user) { setState("idle"); return; }
    const refresh = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => qc.invalidateQueries({ predicate: q => isCardQuery(q.queryKey) }), 150);
    };
    const close = openDashboardStream({
      path: "/api/cards/events", getToken, isUpdate: e => e.startsWith("card."),
      onState: s => { if (s === "unauthorized") endSession(); setState(s); },
      onReady: refresh, onUpdated: refresh,
    });
    return () => { close(); clearTimeout(timer.current); setState("idle"); };
  }, [user, getToken, endSession, qc]);
  return state;
}

/** Sends the customer through the identity provider again (fresh authentication) when the API asks for step-up. */
function stepUp() {
  void getUserManager().signinRedirect({ state: { returnTo: "/cards" }, max_age: 0 });
}

/** Shared error reporting. Step-up requests offer a re-authentication action instead of a dead end. */
export function reportCardError(e: unknown, fallback: string) {
  if (e instanceof ApiError && e.code === "STEP_UP_REQUIRED") { toast.error(e.message, { action: { label: "Confirm it’s you", onClick: stepUp } }); return; }
  if (e instanceof ApiError && e.status === 429) { toast.error(e.retryAfterSeconds ? `Too many requests. Try again in ${e.retryAfterSeconds}s.` : e.message); return; }
  toast.error(e instanceof Error ? e.message : fallback);
}

function useToken() {
  const { getToken } = useAuth();
  return () => { const t = getToken(); if (!t) throw new ApiError("Your session has expired. Sign in again.", 401); return t; };
}

const refreshCards = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ predicate: q => isCardQuery(q.queryKey) });

/** The idempotency key is supplied by the caller and stays stable across retries of the same request. */
export function useIssueCard() {
  const token = useToken(); const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, cardType, key }: { accountId: string; cardType: CardType; key: string }) => createCard(token(), { accountId, cardType }, key),
    onSuccess: () => refreshCards(qc),
  });
}

export function useCardCommand() {
  const token = useToken(); const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, command }: { cardId: string; command: CardCommand }) => runCardCommand(token(), cardId, command),
    onSuccess: () => refreshCards(qc),
  });
}

export function useUpdateLimits() {
  const token = useToken(); const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, limits }: { cardId: string; limits: Partial<CardLimits> }) => updateCardLimits(token(), cardId, limits),
    onSuccess: () => refreshCards(qc),
  });
}

export function useSimulateAuthorization() {
  const token = useToken(); const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, ...payload }: { cardId: string; merchantName: string; amountMinor: number; channel: "ONLINE" | "IN_STORE" }) => simulateCardAuthorization(token(), cardId, payload),
    onSuccess: () => refreshCards(qc),
  });
}
