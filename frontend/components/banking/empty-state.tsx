import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div className="relative mb-4 grid size-16 place-items-center rounded-2xl bg-accent text-brand-text">
        <span aria-hidden className="absolute -right-1.5 -top-1.5 size-3 rounded-full bg-info/40" />
        <span aria-hidden className="absolute -bottom-1 -left-1 size-2 rounded-full bg-success/50" />
        <Icon className="size-7" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
