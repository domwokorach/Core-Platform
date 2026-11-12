"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, isActive } from "./nav-items";

/** Mobile (<640px) primary navigation: four core destinations + More, with safe-area padding. */
export function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const items = NAV.filter(n => n.primary);
  return (
    <nav aria-label="Primary" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(item => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", active ? "text-brand-text" : "text-muted-foreground")}>
                {active && <motion.span layoutId="bottom-active" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />}
                <item.icon className="size-5" />
                {item.label.replace("My ", "")}
              </Link>
            </li>
          );
        })}
        <li>
          <button onClick={onMore} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Menu className="size-5" />More
          </button>
        </li>
      </ul>
    </nav>
  );
}
