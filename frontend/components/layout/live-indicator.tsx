"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useLiveState } from "@/providers/live-provider";

/** "Live" is shown only once the authenticated SSE stream has sent `stream.ready`. Signed-out = clearly a demo. */
export function LiveIndicator({ className }: { className?: string }) {
  const { user, loading } = useAuth();
  const state = useLiveState();
  if (loading) return null;
  const view = !user ? { dot: "bg-muted-foreground", text: "Demo data" }
    : state === "live" ? { dot: "bg-foreground", text: "Live" }
    : state === "offline" ? { dot: "border-2 border-foreground bg-transparent", text: "Offline" }
    : { dot: "bg-muted-foreground animate-pulse", text: state === "reconnecting" ? "Reconnecting" : "Connecting" };
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex h-8 items-center gap-2 rounded-full border bg-card px-3 text-xs font-medium text-muted-foreground", className)}>
      <span className={cn("size-2 rounded-full", view.dot)} aria-hidden />
      {view.text}
      {user && state === "live" && <span className="sr-only"> connection to FINIX is active</span>}
    </span>
  );
}
