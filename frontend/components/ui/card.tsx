import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = ({ className, ...p }: React.ComponentProps<"div">) => (
  <div className={cn("rounded-xl border bg-card text-card-foreground shadow-card", className)} {...p} />
);
export const CardHeader = ({ className, ...p }: React.ComponentProps<"div">) => (
  <div className={cn("flex items-start justify-between gap-3 p-5 pb-3 sm:p-6 sm:pb-3", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: React.ComponentProps<"h2">) => (
  <h2 className={cn("text-lg font-semibold tracking-tight", className)} {...p} />
);
export const CardDescription = ({ className, ...p }: React.ComponentProps<"p">) => (
  <p className={cn("mt-0.5 text-[13px] text-muted-foreground", className)} {...p} />
);
export const CardContent = ({ className, ...p }: React.ComponentProps<"div">) => (
  <div className={cn("p-5 pt-2 sm:p-6 sm:pt-2", className)} {...p} />
);
