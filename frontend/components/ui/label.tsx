import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = ({ className, ...p }: React.ComponentProps<"label">) => (
  <label className={cn("text-[13px] font-medium text-foreground", className)} {...p} />
);
