"use client";

import { Progress as MotionProgress, ProgressIndicator, ProgressTrack } from "@/components/paceui/motion/progress";
import { cn } from "@/lib/utils";

/** Animated progress bar (PaceUI motion-progress). Width reflects the real value; the animation only eases the reveal. */
export function Progress({ value, color = "var(--brand)", className, label }: { value: number; color?: string; className?: string; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <MotionProgress value={v} aria-label={label} className={cn("block w-full", className)} style={{ "--bar": color } as React.CSSProperties}>
      <ProgressTrack className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <ProgressIndicator className="h-full rounded-full bg-[var(--bar)]" />
      </ProgressTrack>
    </MotionProgress>
  );
}
