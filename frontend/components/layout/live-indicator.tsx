"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useLiveState } from "@/providers/live-provider";

/**
 * "Live" (green, pulsing) is shown only once the authenticated SSE stream has sent `stream.ready`; any other state is
 * never green. Disconnected = grey "Offline". Signed-out = clearly a demo. The pulse is CSS-only and disabled for reduced motion.
 * The label collapses to the dot on phones (the text stays available to screen readers).
 */
export function LiveIndicator({ className }: { className?: string }) {
  const { user, loading } = useAuth();
  const state = useLiveState();
  if (loading) return null;
  const live = !!user && state === "live";
  const view = !user ? { text: "Demo data", dot: "bg-muted-foreground" }
    : live ? { text: "Live", dot: "bg-[#22C55E]" }
    : state === "offline" || state === "unauthorized" ? { text: "Offline", dot: "bg-muted-foreground/60" }
    : { text: state === "reconnecting" ? "Reconnecting" : "Connecting", dot: "bg-muted-foreground animate-pulse motion-reduce:animate-none" };
  return (
    <span data-accent role="status" aria-live="polite" className={cn("inline-flex h-8 items-center gap-2 rounded-full border bg-card px-2.5 text-xs font-medium transition-colors duration-300 sm:px-3", live ? "text-foreground" : "text-muted-foreground", className)}>
      <span className="relative flex size-2" aria-hidden>
        {live && <span className="absolute inline-flex size-full rounded-full bg-[#22C55E] opacity-60 motion-safe:animate-ping" />}
        <span className={cn("relative inline-flex size-2 rounded-full transition-colors duration-300", view.dot)} />
      </span>
      <span className="max-sm:sr-only">{view.text}</span>
      {live && <span className="sr-only"> connection to FINIX is active</span>}
    </span>
  );
}
