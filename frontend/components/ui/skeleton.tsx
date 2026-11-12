import { cn } from "@/lib/utils";

/** Shimmer placeholder; respects reduced motion via the global media query. */
export const Skeleton = ({ className, ...p }: React.ComponentProps<"div">) => (
  <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} {...p} />
);
