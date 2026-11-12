"use client";
import * as T from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = ({ delayDuration = 200, ...p }: React.ComponentProps<typeof T.Provider>) => <T.Provider delayDuration={delayDuration} {...p} />;
export const Tooltip = T.Root;
export const TooltipTrigger = T.Trigger;
export const TooltipContent = ({ className, sideOffset = 8, ...p }: React.ComponentProps<typeof T.Content>) => (
  <T.Portal>
    <T.Content sideOffset={sideOffset} className={cn("z-50 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground shadow-lift data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 duration-150", className)} {...p} />
  </T.Portal>
);
