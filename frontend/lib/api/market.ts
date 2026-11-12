import { request } from "@/lib/api/client";
import type { History, HistoryRange, PaperAccount, PaperEnvelope, PaperOrder, PaperPosition, PaperStatus, QuotesResponse } from "@/types/market";

/** All market calls go to the FINIX backend. The browser never talks to Twelve Data or Alpaca and never holds their keys. */
export const getQuotes = (token: string) => request<QuotesResponse>("/api/market/quotes?symbols=AAPL,MSFT,NVDA,NFLX", token);
export const getHistory = (token: string, symbol: string, range: HistoryRange) =>
  request<History>(`/api/market/history/${encodeURIComponent(symbol)}?range=${range}`, token);

export const getPaperStatus = (token: string) => request<PaperStatus>("/api/paper/status", token);
export const getPaperAccount = (token: string) => request<PaperEnvelope<PaperAccount>>("/api/paper/account", token);
export const getPaperPositions = (token: string) => request<PaperEnvelope<PaperPosition[]>>("/api/paper/positions", token);
export const getPaperOrders = (token: string) => request<PaperEnvelope<PaperOrder[]>>("/api/paper/orders", token);
export const submitPaperOrder = (token: string, body: { symbol: string; side: "buy" | "sell"; qty: number }, key: string) =>
  request<PaperEnvelope<PaperOrder>>("/api/paper/orders", token, { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(body) });
