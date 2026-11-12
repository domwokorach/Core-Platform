"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useReducedMotion } from "motion/react";
import { money } from "@/lib/utils/format";
import type { Slice } from "@/lib/utils/analytics";
import { ChartSummary } from "./chart-summary";
import { ChartPatterns, SERIES } from "./patterns";


/** Doughnut of spending by merchant with a legend that doubles as the text alternative. */
export default function SpendingDonut({ data, total }: { data: Slice[]; total: number }) {
  const reduce = useReducedMotion();
  return (
    <figure data-accent className="m-0 flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative size-44 shrink-0" role="img" aria-label={`Spending by merchant, total ${money(total)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <ChartPatterns />
            <Pie data={data} dataKey="valueMinor" nameKey="name" innerRadius="66%" outerRadius="100%" paddingAngle={0} startAngle={90} endAngle={-270} isAnimationActive={!reduce} animationDuration={800}>
              {data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]!.fill} stroke="var(--card)" strokeWidth={2} />)}
            </Pie>
            <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><p className="text-[11px] text-muted-foreground">Total spent</p><p className="num text-lg font-semibold">{money(total)}</p></div>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {data.map((s, i) => (
          <li key={s.name} className="flex items-center gap-2.5 text-sm">
            <i className="size-3 shrink-0 rounded-sm border border-foreground/30" style={{ background: SERIES[i % SERIES.length]!.css }} />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="num text-muted-foreground">{s.share.toFixed(0)}%</span>
            <span className="num w-20 text-right font-medium">{money(s.valueMinor)}</span>
          </li>
        ))}
      </ul>
      <ChartSummary caption="Spending by merchant" headers={["Merchant", "Share", "Amount"]} rows={data.map(s => [s.name, `${s.share.toFixed(0)}%`, money(s.valueMinor)])} />
    </figure>
  );
}
