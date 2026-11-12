import { money } from "@/lib/utils/format";

interface Item { name?: string | number; value?: number | string; color?: string; dataKey?: string | number }
/** Shared tooltip surface for all FINIX charts. Values arrive in minor units. */
export function MoneyTooltip({ active, payload, label, names }: { active?: boolean; payload?: Item[]; label?: string | number; names?: Record<string, string> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lift">
      {label !== undefined && <p className="mb-1.5 font-medium text-muted-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: p.color }} />{names?.[String(p.dataKey)] ?? p.name}</span>
          <span className="num font-semibold">{money(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}
