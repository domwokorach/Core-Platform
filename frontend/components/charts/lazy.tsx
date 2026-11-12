"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** Recharts is heavy: load it on demand with a same-size placeholder so layout doesn't shift. */
const placeholder = (h: number) => function Placeholder() { return <Skeleton className="w-full" style={{ height: h }} />; };

export const BalanceTrendChart = dynamic(() => import("./balance-trend-chart"), { ssr: false, loading: placeholder(280) });
export const SpendingDonut = dynamic(() => import("./spending-donut"), { ssr: false, loading: placeholder(176) });
export const CashflowChart = dynamic(() => import("./cashflow-chart"), { ssr: false, loading: placeholder(260) });
