"use client";

import { useSyncExternalStore } from "react";

/** SSR-safe media query hook (server snapshot is `false`). */
export function useMedia(query: string) {
  return useSyncExternalStore(
    cb => { const m = window.matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
export const useIsMobile = () => useMedia("(max-width: 639px)");
