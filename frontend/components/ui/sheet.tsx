// Sheet API on top of the existing Radix Dialog (components/ui/dialog.tsx): same focus trap, `side` variants and styling.
import * as React from "react";
import { cn } from "@/lib/utils";

export { Dialog as Sheet, DialogContent as SheetContent, DialogDescription as SheetDescription, DialogTitle as SheetTitle } from "./dialog";

export function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5", className)} {...props} />;
}
