import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({ className, ...p }: React.ComponentProps<"table">) => (
  <div className="relative w-full overflow-x-auto"><table className={cn("w-full caption-bottom text-sm", className)} {...p} /></div>
);
export const TableHeader = (p: React.ComponentProps<"thead">) => <thead {...p} />;
export const TableBody = (p: React.ComponentProps<"tbody">) => <tbody {...p} />;
export const TableRow = ({ className, ...p }: React.ComponentProps<"tr">) => (
  <tr className={cn("border-b transition-colors duration-150 last:border-0 hover:bg-muted/50", className)} {...p} />
);
export const TableHead = ({ className, ...p }: React.ComponentProps<"th">) => (
  <th className={cn("h-11 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground", className)} {...p} />
);
export const TableCell = ({ className, ...p }: React.ComponentProps<"td">) => (
  <td className={cn("px-4 py-3.5 align-middle", className)} {...p} />
);
