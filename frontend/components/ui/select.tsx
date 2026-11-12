"use client";
import * as S from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = S.Root;
export const SelectValue = S.Value;
export const SelectTrigger = ({ className, children, ...p }: React.ComponentProps<typeof S.Trigger>) => (
  <S.Trigger className={cn("flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3.5 text-base shadow-sm transition-[border-color,box-shadow] duration-150 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-[placeholder]:text-muted-foreground sm:h-10 sm:text-sm [&>span]:truncate", className)} {...p}>
    {children}
    <S.Icon asChild><ChevronDown className="size-4 shrink-0 text-muted-foreground" /></S.Icon>
  </S.Trigger>
);
export const SelectContent = ({ className, children, ...p }: React.ComponentProps<typeof S.Content>) => (
  <S.Portal>
    <S.Content position="popper" sideOffset={6} className={cn("z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 duration-150", className)} {...p}>
      <S.Viewport className="p-1.5">{children}</S.Viewport>
    </S.Content>
  </S.Portal>
);
export const SelectItem = ({ className, children, ...p }: React.ComponentProps<typeof S.Item>) => (
  <S.Item className={cn("relative flex min-h-10 cursor-default select-none items-center rounded-lg py-2 pl-3 pr-9 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted", className)} {...p}>
    <S.ItemText>{children}</S.ItemText>
    <S.ItemIndicator className="absolute right-3"><Check className="size-4 text-brand-text" /></S.ItemIndicator>
  </S.Item>
);
