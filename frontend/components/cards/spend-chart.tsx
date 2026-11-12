"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { ChartSummary } from "@/components/charts/chart-summary";
import { compactMoney, money, TIME_ZONE } from "@/lib/utils/format";
import type { CardTransaction } from "@/types/cards";

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
const dayLabel = (d: Date) => new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: TIME_ZONE }).format(d);

/** Approved sandbox card spend per day for the last 7 days against the card's daily limit. */
export default function SpendChart({ transactions, dailyLimitMinor, height = 200 }: { transactions: CardTransaction[]; dailyLimitMinor: number; height?: number }) {
  const reduce = useReducedMotion();
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86_400_000));
  const totals = new Map<string, number>();
  for (const t of transactions) if (t.outcome === "APPROVED") totals.set(dayKey(new Date(t.occurredAt)), (totals.get(dayKey(new Date(t.occurredAt))) ?? 0) + t.amountMinor);
  const data = days.map(d => ({ label: dayLabel(d), spentMinor: totals.get(dayKey(d)) ?? 0 }));
  const max = Math.max(dailyLimitMinor, ...data.map(d => d.spentMinor));

  return (
    <figure data-accent className="m-0">
      <div style={{ height }} role="img" aria-label={`Card spending over the last 7 days against the daily limit of ${money(dailyLimitMinor)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <YAxis tickLine={false} axisLine={false} width={48} domain={[0, max]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => compactMoney(v)} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} formatter={v => [money(Number(v)), "Spent"]} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12 }} />
            <ReferenceLine y={dailyLimitMinor} stroke="var(--muted-foreground)" strokeDasharray="5 4" label={{ value: "Daily limit", position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Bar dataKey="spentMinor" fill="var(--expense)" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={!reduce} animationDuration={600} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartSummary caption="Approved card spending by day" headers={["Day", "Spent"]} rows={data.map(d => [d.label, money(d.spentMinor)])} />
    </figure>
  );
}
