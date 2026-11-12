import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground",
      success: "bg-income/12 text-income-text border border-income/30",
      warning: "border border-dashed border-pending/70 bg-pending/12 text-pending-text",
      danger: "border-2 border-expense/70 bg-expense/12 font-semibold text-expense-text",
      info: "border border-border bg-card text-foreground",
      brand: "bg-secondary text-foreground",
    },
  },
  defaultVariants: { tone: "neutral" },
});
export const Badge = ({ className, tone, ...p }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) => (
  <span data-accent={tone === "success" || tone === "warning" || tone === "danger" ? "" : undefined} className={cn(badgeVariants({ tone }), className)} {...p} />
);
