"use client";

import { useReducedMotion } from "motion/react";
import { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";
import { SpringButton } from "@/components/paceui/motion/spring-button";
import { motionSafe } from "@/components/paceui/motion/motion-safe";
import { cn } from "@/lib/utils";

/**
 * FINIX button with a subtle spring press (PaceUI SpringButton). Same look as `Button`. Reduced-motion users, `asChild`
 * and loading buttons get the plain `Button`, and there is never a shake: money-related actions stay calm.
 */
export function ActionButton({ className, variant, size, loading, asChild, children, ...props }: ButtonProps) {
  const reduce = useReducedMotion();
  if (reduce || asChild || loading) return <Button className={className} variant={variant} size={size} loading={loading} asChild={asChild} {...props}>{children}</Button>;
  const { disabled, ...rest } = props;
  return (
    <SpringButton scale={0.96} shaking={false} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled} {...motionSafe(rest)}>
      {children}
    </SpringButton>
  );
}
