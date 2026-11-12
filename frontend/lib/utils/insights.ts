import type { DateRange, Transaction } from "@/types/banking";
import { LEDGER_PAGE, classify, rangeDays } from "./analytics";

const DAY = 86_400_000;
export type Category = "income" | "expense" | "savings" | "profit";
export interface Insight {
  id: string; category: Category;
  /** Plain-text lead (stays neutral colour). */
  lead: string;
  /** Highlighted figure (accent colour, with its own sign/arrow so colour is never the only cue). */
  figure: string;
  /** Neutral tail text. */
  tail: string;
  /** Whether the movement is favourable to the customer. */
  tone: "good" | "bad" | "flat";
}

const sum = (txs: Transaction[], f: (t: Transaction) => boolean) => txs.filter(f).reduce((s, t) => s + Math.abs(t.amountMinor), 0);
const pct = (cur: number, prev: number) => ((cur - prev) / prev) * 100;
const fmtPct = (v: number) => `${v >= 0 ? "\u25B2 +" : "\u25BC \u2212"}${Math.abs(v).toFixed(1)}%`;

/**
 * Period-over-period insights from REAL ledger entries (transfers between own accounts excluded). A comparison is only made
 * when the previous window is fully covered by loaded data; otherwise the text says there is nothing to compare, never a guess.
 */
export function buildInsights(txs: Transaction[], refs: Set<string>, range: DateRange, fmt: (minor: number) => string, now = Date.now()): Insight[] {
  const days = rangeDays(range);
  const real = txs.filter(t => classify(t, refs) !== "transfer");
  const cur = Number.isFinite(days) ? real.filter(t => now - +new Date(t.occurredAt) <= days * DAY) : real;
  const label = range === "all" ? "loaded activity" : `the last ${days} days`;
  const income = sum(cur, t => t.amountMinor > 0), spend = sum(cur, t => t.amountMinor < 0);
  const out: Insight[] = [];

  const oldest = txs.length ? Math.min(...txs.map(t => +new Date(t.occurredAt))) : now;
  const covered = Number.isFinite(days) && (txs.length < LEDGER_PAGE || oldest <= now - 2 * days * DAY);
  const prev = covered ? real.filter(t => { const age = now - +new Date(t.occurredAt); return age > days * DAY && age <= 2 * days * DAY; }) : [];
  const pIncome = sum(prev, t => t.amountMinor > 0), pSpend = sum(prev, t => t.amountMinor < 0);

  if (income > 0 || spend > 0) {
    if (covered && pIncome > 0) { const v = pct(income, pIncome); out.push({ id: "income", category: "income", lead: `Income was ${fmt(income)} over ${label}, `, figure: fmtPct(v), tail: " compared with the previous period.", tone: v > 0 ? "good" : v < 0 ? "bad" : "flat" }); }
    else out.push({ id: "income", category: "income", lead: `Income was ${fmt(income)} over ${label}`, figure: "", tail: covered ? " (none in the previous period to compare)." : ".", tone: "flat" });
    if (covered && pSpend > 0) { const v = pct(spend, pSpend); out.push({ id: "spend", category: "expense", lead: `Spending was ${fmt(spend)}, `, figure: fmtPct(v), tail: " compared with the previous period.", tone: v < 0 ? "good" : v > 0 ? "bad" : "flat" }); }
    else out.push({ id: "spend", category: "expense", lead: `Spending was ${fmt(spend)} over ${label}`, figure: "", tail: covered ? " (none in the previous period to compare)." : ".", tone: "flat" });
    if (income > 0) {
      const kept = income - spend, share = (kept / income) * 100;
      out.push({ id: "savings", category: "savings", lead: kept >= 0 ? "You kept " : "You spent more than you earned by ", figure: kept >= 0 ? `${fmt(kept)} (${share.toFixed(0)}%)` : fmt(-kept), tail: kept >= 0 ? " of your income." : ".", tone: kept >= 0 ? "good" : "bad" });
    }
  }
  return out;
}
