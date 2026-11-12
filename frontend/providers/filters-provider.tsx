"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { DateRange } from "@/types/banking";

interface FiltersValue {
  range: DateRange;
  setRange: (r: DateRange) => void;
  search: string;
  setSearch: (s: string) => void;
}
const Ctx = createContext<FiltersValue | null>(null);

/** Date range + global search shared by the header controls, dashboard charts and transaction views. */
export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<DateRange>("30d");
  const [search, setSearch] = useState("");
  const value = useMemo(() => ({ range, setRange, search, setSearch }), [range, search]);
  return <Ctx value={value}>{children}</Ctx>;
}
export function useFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters must be used inside <FiltersProvider>");
  return ctx;
}
