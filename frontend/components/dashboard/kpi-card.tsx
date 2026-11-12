"use client";

import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { percent } from "@/lib/utils/format";

export interface KpiProps { label: string; value: string; icon: LucideIcon; hint?: string; delta?: number; tone?: "income" | "expense" | "profit" | "brand" }

const tones = { income: "bg-income/12 text-income-text", expense: "bg-expense/12 text-expense-text", profit: "bg-profit/12 text-profit-text", brand: "bg-accent text-accent-foreground" };

/** Statistic card. The displayed value is always the final real figure — it never counts up through false numbers. */
export function KpiCard({ label, value, icon: Icon, hint, delta, tone = "brand" }: KpiProps) {
  const Delta = delta === undefined || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.18 }}>
      <Card className="h-full p-4 sm:p-5 transition-shadow duration-200 hover:shadow-lift">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <span data-accent className={cn("grid size-9 place-items-center rounded-lg", tones[tone])}><Icon className="size-[18px]" /></span>
        </div>
        <p className="num mt-3 text-[1.75rem] font-semibold leading-none tracking-tight">{value}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          {delta !== undefined && (
            <span data-accent className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium", delta > 0 ? "bg-income/12 text-income-text" : delta < 0 ? "bg-expense/12 text-expense-text" : "bg-muted")}>
              <Delta className="size-3" /><span className="num">{percent(delta)}</span>
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      </Card>
    </motion.div>
  );
}
