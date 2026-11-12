import { AlertTriangle, CircleDot, Clock, MoonStar, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DataClass } from "@/types/market";

export function MarketStatusBadge({ open }: { open: boolean }) {
  return open ? <Badge tone="brand"><CircleDot />Market open</Badge> : <Badge tone="neutral"><MoonStar />Market closed</Badge>;
}

/** Freshness label. "Live" only appears when the backend has classified the quote LIVE (entitlement confirmed + fresh + market open). */
export function DataClassBadge({ dataClass }: { dataClass: DataClass }) {
  switch (dataClass) {
    case "LIVE": return <Badge tone="brand"><Radio />Live</Badge>;
    case "DELAYED": return <Badge tone="info"><Clock />Delayed</Badge>;
    case "END_OF_DAY": return <Badge tone="info"><MoonStar />End of day</Badge>;
    default: return <Badge tone="warning"><AlertTriangle />Stale</Badge>;
  }
}
