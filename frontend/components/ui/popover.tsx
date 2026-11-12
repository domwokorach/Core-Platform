"use client";
import * as P from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverContent = ({ className, align = "end", sideOffset = 8, ...p }: React.ComponentProps<typeof P.Content>) => (
  <P.Portal>
    <P.Content align={align} sideOffset={sideOffset} className={cn("z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-0 text-popover-foreground shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150", className)} {...p} />
  </P.Portal>
);
