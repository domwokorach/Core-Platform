"use client";
import * as React from "react";
import * as T from "@radix-ui/react-tabs";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;
export const TabsContent = ({ className, ...p }: React.ComponentProps<typeof T.Content>) => (
  <T.Content className={cn("outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 duration-200", className)} {...p} />
);
export const TabsList = ({ className, ...p }: React.ComponentProps<typeof T.List>) => (
  <T.List className={cn("inline-flex h-10 items-center gap-1 rounded-lg bg-muted p-1", className)} {...p} />
);

/** Trigger with a shared animated "pill" that slides between tabs (layoutId scoped per tab list). */
export function TabsTrigger({ className, children, value, active, group = "tabs", ...p }: React.ComponentProps<typeof T.Trigger> & { active?: boolean; group?: string }) {
  return (
    <T.Trigger value={value} className={cn("relative inline-flex h-8 min-w-14 items-center justify-center rounded-md px-3 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground data-[state=active]:text-foreground", className)} {...p}>
      {active && <motion.span layoutId={`${group}-pill`} className="absolute inset-0 rounded-md bg-card shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
      <span className="relative">{children}</span>
    </T.Trigger>
  );
}
