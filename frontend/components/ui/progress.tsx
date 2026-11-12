"use client";
import * as P from "@radix-ui/react-progress";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Animated progress bar. Width reflects the real value; the animation only eases the reveal. */
export function Progress({ value, color = "var(--brand)", className, label }: { value: number; color?: string; className?: string; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <P.Root value={v} aria-label={label} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <P.Indicator asChild>
        <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
      </P.Indicator>
    </P.Root>
  );
}
