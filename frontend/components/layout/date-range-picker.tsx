"use client";

import { CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFilters } from "@/providers/filters-provider";
import type { DateRange } from "@/types/banking";

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" }, { value: "all", label: "All loaded activity" },
];

export function DateRangePicker({ className }: { className?: string }) {
  const { range, setRange } = useFilters();
  return (
    <Select value={range} onValueChange={v => setRange(v as DateRange)}>
      <SelectTrigger aria-label="Date range" className={className}>
        <span className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" /><SelectValue /></span>
      </SelectTrigger>
      <SelectContent>{OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}
