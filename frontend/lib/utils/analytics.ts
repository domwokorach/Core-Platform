import type { DateRange, Transaction, TransferReceipt } from "@/types/banking";

/** Ledger returns the latest 50 entries only; callers show a notice when the window may be truncated. */
export const LEDGER_PAGE = 50;
const DAY = 86_400_000;

export const rangeDays = (r: DateRange) => (r === "7d" ? 7 : r === "30d" ? 30 : r === "90d" ? 90 : Infinity);

export function inRange<T extends Transaction>(txs: T[], range: DateRange, now = Date.now()): T[] {
  const days = rangeDays(range);
  return Number.isFinite(days) ? txs.filter(t => now - new Date(t.occurredAt).getTime() <= days * DAY) : txs;
}

export type TxKind = "credit" | "debit" | "transfer";

/** An entry belongs to an own-account transfer when its journal reference matches a committed transfer receipt. */
export function transferRefs(transfers: TransferReceipt[]) {
  return new Set(transfers.map(t => t.reference));
}
export const classify = (t: Transaction, refs: Set<string>): TxKind =>
  refs.has(t.reference) ? "transfer" : t.amountMinor >= 0 ? "credit" : "debit";

export interface TrendPoint { date: string; label: string; balanceMinor: number }

/**
 * Daily closing balance, reconstructed backwards from the authoritative current total using only real ledger entries.
 * Nothing is interpolated: each point is `total − Σ entries posted after that day's end`.
 */
export function balanceSeries(totalMinor: number, txs: Transaction[], range: DateRange, now = new Date()): TrendPoint[] {
  const sorted = [...txs].sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  const oldest = sorted.length ? +new Date(sorted[sorted.length - 1]!.occurredAt) : now.getTime();
  const spanDays = Math.max(1, Math.ceil((now.getTime() - oldest) / DAY) + 1);
  const days = Math.min(Number.isFinite(rangeDays(range)) ? rangeDays(range) : spanDays, Math.max(spanDays, 7));
  const fmt = new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric", timeZone: "Europe/London" });
  const points: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const end = new Date(now); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - i);
    const after = sorted.filter(t => +new Date(t.occurredAt) > end.getTime()).reduce((s, t) => s + t.amountMinor, 0);
    points.push({ date: end.toISOString(), label: fmt.format(end), balanceMinor: totalMinor - after });
  }
  return points;
}

export interface FlowPoint { label: string; incomeMinor: number; spendingMinor: number }

/** Weekly (or daily for ≤14d ranges) income vs spending, excluding own-account transfers. */
export function cashflow(txs: Transaction[], refs: Set<string>, range: DateRange, now = new Date()): FlowPoint[] {
  const daily = range === "7d";
  const buckets = daily ? 7 : range === "30d" ? 5 : range === "90d" ? 13 : 8;
  const size = daily ? DAY : 7 * DAY;
  const fmt = new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric", timeZone: "Europe/London" });
  const out: FlowPoint[] = [];
  for (let b = buckets - 1; b >= 0; b--) {
    const end = now.getTime() - b * size, start = end - size;
    const inside = txs.filter(t => { const x = +new Date(t.occurredAt); return x > start && x <= end && classify(t, refs) !== "transfer"; });
    out.push({
      label: fmt.format(new Date(end)),
      incomeMinor: inside.filter(t => t.amountMinor > 0).reduce((s, t) => s + t.amountMinor, 0),
      spendingMinor: inside.filter(t => t.amountMinor < 0).reduce((s, t) => s - t.amountMinor, 0),
    });
  }
  return out;
}

export interface Slice { name: string; valueMinor: number; share: number }

/** Spending by merchant/description (the ledger carries no category field, so none is invented). */
export function spendingByMerchant(txs: Transaction[], refs: Set<string>, max = 5): Slice[] {
  const map = new Map<string, number>();
  for (const t of txs) if (classify(t, refs) === "debit") map.set(t.description, (map.get(t.description) ?? 0) - t.amountMinor);
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  const head = sorted.slice(0, max);
  const rest = sorted.slice(max).reduce((s, [, v]) => s + v, 0);
  const rows = rest ? [...head, ["Other", rest] as [string, number]] : head;
  return rows.map(([name, valueMinor]) => ({ name, valueMinor, share: total ? (valueMinor / total) * 100 : 0 }));
}
