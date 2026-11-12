"use client";

import { useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ease } from "@/lib/animations/variants";
import { SidebarProvider, useSidebar } from "@/components/paceui/motion/sidebar";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";
import { AppSidebar } from "./app-sidebar";
import { DemoBanner } from "@/components/banking/demo-banner";
import { LogoAttribution } from "@/components/banking/logo-attribution";

const KEY = "finix.sidebar.collapsed";

function Body({ children }: { children: React.ReactNode }) {
  const { toggleSidebar, setOpenMobile } = useSidebar();
  return (
    <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Header onMenu={toggleSidebar} /></motion.div>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-28 pt-5 outline-none sm:px-6 sm:pb-10 lg:px-8 lg:pt-7">
        <DemoBanner />
        {children}
        <footer className="mt-10 border-t pt-4"><LogoAttribution /></footer>
      </main>
      <BottomNav onMore={() => setOpenMobile(true)} />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { try { setCollapsed(localStorage.getItem(KEY) === "1"); } catch { /* storage unavailable */ } }, []);
  const onOpenChange = (open: boolean) => { setCollapsed(!open); try { localStorage.setItem(KEY, open ? "0" : "1"); } catch { /* ignore */ } };

  return (
    <TooltipProvider>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease }}>
        <a href="#main" className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
        {/* PaceUI sidebar: persistent collapsible rail from 768px, sheet below; width tokens match the previous layout. */}
        <SidebarProvider open={!collapsed} onOpenChange={onOpenChange} style={{ "--sidebar-width": "17rem", "--sidebar-width-icon": "4.75rem" } as React.CSSProperties}>
          <AppSidebar />
          <Body>{children}</Body>
        </SidebarProvider>
      </MotionConfig>
    </TooltipProvider>
  );
}
