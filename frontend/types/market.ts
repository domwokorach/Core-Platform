export type DataClass = "LIVE" | "DELAYED" | "END_OF_DAY" | "STALE";

export interface GbpEstimate { pair: string; rate: string; rateTimestamp: string; source: string; price: string; change: string | null; indicative: true }

export interface QuoteView {
  symbol: string; name: string; exchange: string; currency: string;
  price: string; previousClose: string | null; change: string | null; percentChange: string | null;
  open: string | null; high: string | null; low: string | null; volume: number | null;
  quotedAt: string | null; fetchedAt: string; marketOpen: boolean; dataClass: DataClass; stale: boolean;
  externalUrl: string; source: string; gbp: GbpEstimate | null;
}
export interface SymbolError { symbol: string; code: string; message: string; retryAfterSeconds: number | null }
export interface FxInfo { pair: string; rate: string | null; rateTimestamp: string | null; source: string | null; error: string | null }
export interface QuotesResponse { quotes: QuoteView[]; errors: SymbolError[]; fx: FxInfo | null; generatedAt: string }

export interface HistoryPoint { t: number; datetime: string; open: number; high: number; low: number; close: number; volume: number | null }
export interface History { symbol: string; range: string; interval: string; currency: string; timezone: string; points: HistoryPoint[]; fetchedAt: string; stale: boolean }
export type HistoryRange = "1D" | "1W" | "1M" | "3M" | "1Y";

/** Static, non-financial instrument metadata used to render honest "unavailable" cards (no prices). */
export const WATCHLIST = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", url: "https://www.nasdaq.com/market-activity/stocks/aapl" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", url: "https://www.nasdaq.com/market-activity/stocks/msft" },
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", url: "https://www.nasdaq.com/market-activity/stocks/nvda" },
  { symbol: "NFLX", name: "Netflix Inc.", exchange: "NASDAQ", url: "https://www.nasdaq.com/market-activity/stocks/nflx" },
] as const;

export interface PaperEnvelope<T> { mode: "PAPER"; notice: string; data: T }
export interface PaperStatus { enabled: boolean; mode: "PAPER"; provider: string }
export interface PaperAccount { status: string; cash: string; equity: string; buyingPower: string; currency: string; tradingBlocked: boolean }
export interface PaperPosition { symbol: string; qty: string; side: string; avgEntryPrice: string; marketValue: string; currentPrice: string; unrealizedPl: string; unrealizedPlpc: string }
export interface PaperOrder { id: string; clientOrderId: string; symbol: string; side: string; type: string; qty: string | null; filledQty: string; filledAvgPrice: string | null; status: string; submittedAt: string | null }
