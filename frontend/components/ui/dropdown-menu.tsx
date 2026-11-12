"use client";
import * as D from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = D.Root;
export const DropdownMenuTrigger = D.Trigger;
export const DropdownMenuContent = ({ className, sideOffset = 8, align = "end", ...p }: React.ComponentProps<typeof D.Content>) => (
  <D.Portal>
    <D.Content sideOffset={sideOffset} align={align} className={cn("z-50 min-w-52 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-150", className)} {...p} />
  </D.Portal>
);
export const DropdownMenuItem = ({ className, ...p }: React.ComponentProps<typeof D.Item>) => (
  <D.Item className={cn("relative flex min-h-9 cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground", className)} {...p} />
);
export const DropdownMenuLabel = ({ className, ...p }: React.ComponentProps<typeof D.Label>) => (
  <D.Label className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", className)} {...p} />
);
export const DropdownMenuSeparator = ({ className, ...p }: React.ComponentProps<typeof D.Separator>) => (
  <D.Separator className={cn("-mx-1.5 my-1.5 h-px bg-border", className)} {...p} />
);
