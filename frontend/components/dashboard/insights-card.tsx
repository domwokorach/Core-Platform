"use client";

import { motion } from "motion/react";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/use-overview";
import { buildInsights, type Category } from "@/lib/utils/insights";
import { cn } from "@/lib/utils";
import { money } from "@/lib/utils/format";
import { useFilters } from "@/providers/filters-provider";

const dot: Record<Category, string> = { income: "bg-income", expense: "bg-expense", savings: "bg-savings", profit: "bg-profit" };
const text: Record<Category, string> = { income: "text-income-text", expense: "text-expense-text", savings: "text-savings-text", profit: "text-profit-text" };

/** Favourable moves read emerald (or the category colour for savings/profit), unfavourable moves read coral. */
const figureClass = (c: Category, tone: "good" | "bad" | "flat") =>
  tone === "bad" ? "text-expense-text" : tone === "good" ? (c === "savings" || c === "profit" ? text[c] : "text-income-text") : text[c];

/** Short written insights. Only the key figure is accented (same colour as its chart series); every figure carries an arrow or label. */
export function InsightsCard({ className }: { className?: string }) {
  const { data, refs, isLoading } = useOverview();
  const { range } = useFilters();
  const items = data ? buildInsights(data.transactions, refs, range, m => money(m, data.currency)) : [];
  return (
    <Card className={className}>
      <CardHeader><div><CardTitle>Insights</CardTitle><CardDescription>Calculated from your posted ledger entries</CardDescription></div><Lightbulb className="size-5 text-muted-foreground" aria-hidden /></CardHeader>
      <CardContent>
        {isLoading || !data ? <Skeleton className="h-24" /> : items.length ? (
          <ul className="space-y-3.5">
            {items.map((i, n) => (
              <motion.li key={i.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * n, duration: 0.28 }} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
                <i aria-hidden data-accent className={cn("mt-2 size-2 shrink-0 rounded-full", dot[i.category])} />
                <p>{i.lead}{i.figure && <strong data-accent className={cn("num font-semibold", figureClass(i.category, i.tone))}>{i.figure}</strong>}{i.tail}{i.tone !== "flat" && <span className="sr-only"> This is {i.tone === "good" ? "favourable" : "unfavourable"}.</span>}</p>
              </motion.li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No income or spending in this range yet.</p>}
      </CardContent>
    </Card>
  );
}
