"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const SpendChart = dynamic(() => import("@/components/cards/spend-chart"), { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> });
