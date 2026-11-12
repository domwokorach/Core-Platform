"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { openDashboardStream, type StreamState } from "@/lib/api/events";
import { useAuth } from "@/providers/auth-provider";

const LiveContext = createContext<StreamState>("idle");
export const useLiveState = () => useContext(LiveContext);

/**
 * Authenticated SSE subscription. Events are invalidation hints: on every (re)connect and every
 * `dashboard.updated` all banking queries are refetched from the authoritative API, coalesced into one burst.
 */
export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { user, getToken, endSession } = useAuth();
  const qc = useQueryClient();
  const [state, setState] = useState<StreamState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!user) { setState("idle"); return; }
    const refresh = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => qc.invalidateQueries({ queryKey: ["banking"] }), 150);
    };
    const close = openDashboardStream({
      getToken,
      onState: s => { if (s === "unauthorized") endSession(); setState(s); },
      onReady: refresh,
      onUpdated: refresh,
    });
    return () => { close(); clearTimeout(timer.current); setState("idle"); };
  }, [user, getToken, endSession, qc]);

  return <LiveContext value={state}>{children}</LiveContext>;
}
