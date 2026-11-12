"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { compactMoney, money } from "@/lib/utils/format";
import type { TrendPoint } from "@/lib/utils/analytics";
import { ChartSummary } from "./chart-summary";
import { MoneyTooltip } from "./chart-tooltip";

/** Closing balance per day, reconstructed from real ledger entries. The line draws in; no values are interpolated. */
export default function BalanceTrendChart({ data, height = 280 }: { data: TrendPoint[]; height?: number }) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const step = Math.max(1, Math.ceil(data.length / 6));
  const first = data[0], last = data[data.length - 1];
  return (
    <figure data-accent className="m-0">
      <div style={{ height }} role="img" aria-label={first && last ? `Balance trend from ${money(first.balanceMinor)} on ${first.label} to ${money(last.balanceMinor)} on ${last.label}` : "Balance trend"}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--profit)" stopOpacity={0.32} /><stop offset="100%" stopColor="var(--profit)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} interval={step - 1} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={56} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => compactMoney(v)} domain={["auto", "auto"]} />
            <Tooltip content={<MoneyTooltip names={{ balanceMinor: "Balance" }} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "4 4", strokeOpacity: 0.6 }} />
            <Area type="monotone" dataKey="balanceMinor" stroke="var(--profit)" strokeWidth={2.5} fill={`url(#g${id})`} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)", fill: "var(--profit)" }} isAnimationActive={!reduce} animationDuration={900} animationEasing="ease-out" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ChartSummary caption="Daily closing balance" headers={["Date", "Balance"]} rows={data.map(d => [d.label, money(d.balanceMinor)])} />
    </figure>
  );
}
