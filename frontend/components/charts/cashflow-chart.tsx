"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { compactMoney, money } from "@/lib/utils/format";
import type { FlowPoint } from "@/lib/utils/analytics";
import { ChartSummary } from "./chart-summary";
import { MoneyTooltip } from "./chart-tooltip";

export default function CashflowChart({ data, height = 260 }: { data: FlowPoint[]; height?: number }) {
  const reduce = useReducedMotion();
  return (
    <figure data-accent className="m-0">
      <div style={{ height }} role="img" aria-label="Income compared with spending by period">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} width={52} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => compactMoney(v)} />
            <Tooltip content={<MoneyTooltip names={{ incomeMinor: "Income", spendingMinor: "Spending" }} />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
            <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={(v: string) => (v === "incomeMinor" ? "Income" : "Spending")} />
            <Bar dataKey="incomeMinor" fill="var(--income)" radius={[5, 5, 0, 0]} maxBarSize={22} isAnimationActive={!reduce} animationDuration={700} />
            <Bar dataKey="spendingMinor" fill="var(--expense)" radius={[5, 5, 0, 0]} maxBarSize={22} isAnimationActive={!reduce} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartSummary caption="Income and spending by period" headers={["Period", "Income", "Spending"]} rows={data.map(d => [d.label, money(d.incomeMinor), money(d.spendingMinor)])} />
    </figure>
  );
}
