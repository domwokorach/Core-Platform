import { Ban, CheckCircle2, Clock, Snowflake, XCircle, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CardStatus } from "@/types/cards";

/** Status is always icon + text, never colour alone. */
export const CARD_STATUS: Record<CardStatus, { label: string; icon: LucideIcon; tone: "success" | "warning" | "info" | "danger" | "neutral" }> = {
  ACTIVE: { label: "Active", icon: CheckCircle2, tone: "success" },
  PENDING_ACTIVATION: { label: "Pending activation", icon: Clock, tone: "warning" },
  FROZEN: { label: "Frozen", icon: Snowflake, tone: "info" },
  BLOCKED: { label: "Blocked", icon: Ban, tone: "danger" },
  CLOSED: { label: "Closed", icon: XCircle, tone: "neutral" },
};

export function CardStatusBadge({ status }: { status: CardStatus }) {
  const s = CARD_STATUS[status];
  return <Badge tone={s.tone}><s.icon aria-hidden />{s.label}</Badge>;
}
