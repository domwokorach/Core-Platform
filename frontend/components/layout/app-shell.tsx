"use client";

import { useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ease } from "@/lib/animations/variants";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { DemoBanner } from "@/components/banking/demo-banner";
import { LogoAttribution } from "@/components/banking/logo-attribution";
import { usePathname } from "next/navigation";

const KEY = "finix.sidebar.collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  useEffect(() => { try { setCollapsed(localStorage.getItem(KEY) === "1"); } catch { /* storage unavailable */ } }, []);
  useEffect(() => setDrawer(false), [pathname]);
  const toggle = () => setCollapsed(c => { try { localStorage.setItem(KEY, c ? "0" : "1"); } catch { /* ignore */ } return !c; });

  return (
    <TooltipProvider>
      <MotionConfig transition={{ duration: 0.28, ease }}>
        <a href="#main" className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
        {/* Desktop persistent sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0, width: collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)" }}
          transition={{ duration: 0.28, ease }}
          className="fixed inset-y-0 left-0 z-40 hidden border-r bg-sidebar lg:block"
        >
          <Sidebar collapsed={collapsed} onToggle={toggle} />
        </motion.div>
        {/* Tablet / mobile drawer */}
        <Dialog open={drawer} onOpenChange={setDrawer}>
          <DialogContent side="left" className="p-0" hideClose>
            <DialogTitle className="sr-only">Navigation menu</DialogTitle>
            <DialogDescription className="sr-only">Navigate between FINIX sections</DialogDescription>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </DialogContent>
        </Dialog>
        <div className="min-h-dvh transition-[padding] duration-300 ease-out lg:pl-[var(--sidebar-width)] lg:data-[collapsed=true]:pl-[var(--sidebar-width-collapsed)]" data-collapsed={collapsed}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Header onMenu={() => setDrawer(true)} /></motion.div>
          <main id="main" tabIndex={-1} className="mx-auto max-w-[1600px] px-4 pb-28 pt-5 outline-none sm:px-6 sm:pb-10 lg:px-8 lg:pt-7">
            <DemoBanner />
            {children}
            <footer className="mt-10 border-t pt-4"><LogoAttribution /></footer>
          </main>
        </div>
        <BottomNav onMore={() => setDrawer(true)} />
      </MotionConfig>
    </TooltipProvider>
  );
}
