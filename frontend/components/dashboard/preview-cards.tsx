"use client";

import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { goals } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { money } from "@/lib/utils/format";

/** Savings goals have no backend yet; these are labelled "Preview" and never described as ledger data. */
export function GoalCards({ limit }: { limit?: number }) {
  return (
    <>
      {goals.slice(0, limit).map(g => {
        const pct = (g.current / g.target) * 100;
        return (
          <Card key={g.id} className="p-5 transition-shadow hover:shadow-lift">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent text-brand-text"><Target className="size-[18px]" /></span><div><p className="text-sm font-medium">{g.label}</p><p className="num text-xs text-muted-foreground">{money(g.current)} of {money(g.target)}</p></div></div>
              <span data-accent className="num text-sm font-semibold text-savings-text">{pct.toFixed(0)}%</span>
            </div>
            <div data-accent><Progress className="mt-4" value={pct} color={g.color} label={`${g.label} progress`} /></div>
          </Card>
        );
      })}
    </>
  );
}

export function GoalsPanel() {
  return (
    <Card>
      <CardHeader><div><CardTitle>Savings goals</CardTitle><CardDescription>Illustrative targets</CardDescription></div><Badge tone="neutral">Preview</Badge></CardHeader>
      <CardContent className="space-y-5">
        {goals.slice(0, 3).map(g => {
          const pct = (g.current / g.target) * 100;
          return <div key={g.id}><div className="mb-2 flex justify-between text-sm"><span className="font-medium">{g.label}</span><span data-accent className="num font-medium text-savings-text">{pct.toFixed(0)}%</span></div><div data-accent><Progress value={pct} color={g.color} label={`${g.label} progress`} /></div></div>;
        })}
      </CardContent>
    </Card>
  );
}
