"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { formatPrice } from "@/lib/utils/format";
import type { History } from "@/types/market";
import { ChartSummary } from "@/components/charts/chart-summary";

const DAILY = new Set(["1M", "3M", "1Y"]);
const fmtAxis = (range: string, t: number) =>
  new Intl.DateTimeFormat("en-GB", DAILY.has(range) ? { day: "numeric", month: "short", timeZone: "Europe/London" } : { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(t));
const fmtTip = (range: string, t: number) =>
  new Intl.DateTimeFormat("en-GB", DAILY.has(range) ? { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" } : { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London", timeZoneName: "short" }).format(new Date(t));

/** Price history in the security's native currency. Line colour follows the period's direction (green up / red down). */
export default function StockChart({ history, height = 300 }: { history: History; height?: number }) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const pts = history.points;
  const up = pts.length < 2 || pts[pts.length - 1]!.close >= pts[0]!.close;
  const color = up ? "var(--income)" : "var(--expense)";
  const cur = history.currency || "USD";
  return (
    <figure data-accent className="m-0">
      <div style={{ height }} role="img" aria-label={pts.length ? `${history.symbol} price from ${formatPrice(pts[0]!.close, cur)} to ${formatPrice(pts[pts.length - 1]!.close, cur)} over ${history.range}` : `${history.symbol} price chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={pts} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs><linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.28} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickLine={false} axisLine={false} tickFormatter={(t: number) => fmtAxis(history.range, t)} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} minTickGap={36} />
            <YAxis orientation="right" tickLine={false} axisLine={false} width={64} domain={["auto", "auto"]} tickFormatter={(v: number) => formatPrice(v, cur, 0)} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "4 4" }} content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as History["points"][number] | undefined) : undefined;
              if (!p) return null;
              return <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lift"><p className="text-muted-foreground">{fmtTip(history.range, p.t)}</p><p className="num mt-1 text-sm font-semibold">{formatPrice(p.close, cur)}</p><p className="num text-muted-foreground">H {formatPrice(p.high, cur)} · L {formatPrice(p.low, cur)}</p></div>;
            }} />
            <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2.25} fill={`url(#s${id})`} dot={false} activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--card)", fill: color }} isAnimationActive={!reduce} animationDuration={800} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ChartSummary caption={`${history.symbol} closing prices (${cur})`} headers={["Time", "Close"]} rows={pts.map(p => [fmtTip(history.range, p.t), formatPrice(p.close, cur)])} />
    </figure>
  );
}
