"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import { MotionConfig } from "motion/react";

/** Theme + motion settings. `reducedMotion="user"` makes every Motion animation honour prefers-reduced-motion. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemes>
  );
}
