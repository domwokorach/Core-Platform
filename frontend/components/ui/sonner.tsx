"use client";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as "light" | "dark") ?? "light"}
      position="top-center"
      toastOptions={{ classNames: { toast: "!rounded-xl !border !border-border !bg-popover !text-popover-foreground !shadow-lift", description: "!text-muted-foreground" } }}
    />
  );
}
