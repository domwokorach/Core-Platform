import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, ArrowRightLeft, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TxKind } from "@/lib/utils/analytics";

/** Status is icon + text + fill/outline style (solid = completed, dashed = pending, heavy outline = failed). The ledger only holds completed entries; pending/failed are used by transfer UI states. */
export function StatusBadge({ status }: { status: "posted" | "pending" | "failed" }) {
  if (status === "pending") return <Badge tone="warning"><Clock />Pending</Badge>;
  if (status === "failed") return <Badge tone="danger"><XCircle />Failed</Badge>;
  return <Badge tone="success"><CheckCircle2 />Completed</Badge>;
}

export function KindBadge({ kind }: { kind: TxKind }) {
  if (kind === "credit") return <Badge tone="brand"><ArrowDownLeft />Credit</Badge>;
  if (kind === "transfer") return <Badge tone="info"><ArrowRightLeft />Transfer</Badge>;
  return <Badge tone="neutral"><ArrowUpRight />Debit</Badge>;
}
