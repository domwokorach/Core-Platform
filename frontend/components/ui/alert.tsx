import * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative flex gap-3 rounded-xl border border-border bg-muted p-3.5 text-sm text-foreground [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", className)}
      {...props}
    />
  );
}
export const AlertTitle = ({ className, ...p }: React.ComponentProps<"p">) => <p className={cn("font-medium leading-5", className)} {...p} />;
export const AlertDescription = ({ className, ...p }: React.ComponentProps<"p">) => <p className={cn("mt-0.5 text-[13px] leading-5 text-muted-foreground", className)} {...p} />;
