"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo } from "./logo";
import { NAV, isActive } from "./nav-items";

interface Props { collapsed?: boolean; onToggle?: () => void; onNavigate?: () => void; className?: string }

/** Navigation list used by the persistent desktop sidebar and the tablet/mobile drawer. */
export function Sidebar({ collapsed = false, onToggle, onNavigate, className }: Props) {
  const pathname = usePathname();
  return (
    <aside aria-label="Primary" className={cn("flex h-full flex-col bg-sidebar", className)}>
      <div className={cn("flex h-[4.5rem] items-center px-5", collapsed && "justify-center px-0")}>
        <Link href="/" aria-label="FINIX home" className="rounded-lg" onClick={onNavigate}><Logo collapsed={collapsed} /></Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {NAV.map(item => {
            const active = isActive(pathname, item.href);
            const link = (
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "group relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground",
                  active && "text-nav-active-foreground hover:bg-transparent hover:text-nav-active-foreground", collapsed && "justify-center px-0",
                )}
              >
                {active && (
                  <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg bg-nav-active shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                )}
                <item.icon className="relative size-[19px] shrink-0" />
                {!collapsed && (
                  <span className="relative flex flex-1 items-center justify-between">
                    {item.label}
                    {item.preview && <span className="rounded-full border border-current/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Preview</span>}
                  </span>
                )}
              </Link>
            );
            return (
              <li key={item.href}>
                {collapsed ? (
                  <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip>
                ) : link}
              </li>
            );
          })}
        </ul>
      </nav>
      {onToggle && (
        <div className="border-t p-3">
          <button
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={cn("flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", collapsed && "justify-center px-0")}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <><PanelLeftClose className="size-[18px]" />Collapse</>}
          </button>
        </div>
      )}
    </aside>
  );
}
