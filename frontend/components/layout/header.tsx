"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboard } from "@/hooks/use-banking";
import { greeting } from "@/lib/utils/format";
import { useFilters } from "@/providers/filters-provider";
import { useAuth } from "@/providers/auth-provider";
import { DateRangePicker } from "./date-range-picker";
import { LiveIndicator } from "./live-indicator";
import { LogoMark } from "./logo";
import { NAV, isActive } from "./nav-items";
import { NotificationsPopover } from "./notifications-popover";
import { ProfileMenu } from "./profile-menu";
import { ThemeToggle } from "./theme-toggle";
import { useEffect, useRef, useState } from "react";

export function Header({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { data } = useDashboard();
  const { search, setSearch } = useFilters();
  const searchRef = useRef<HTMLInputElement>(null);
  const [hello, setHello] = useState("Welcome");
  useEffect(() => setHello(greeting()), []);
  const page = NAV.find(n => isActive(pathname, n.href));
  const first = user ? data?.customerName.split(" ")[0] : undefined;

  // ⌘K / Ctrl+K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" className="-ml-2 hidden sm:inline-flex lg:hidden" onClick={onMenu} aria-label="Open navigation menu"><Menu className="size-5" /></Button>
        <LogoMark className="size-8 sm:hidden" />
        <div className="min-w-[7rem] flex-1">
          <p className="truncate text-xs text-muted-foreground sm:text-[13px]">{hello}{first ? `, ${first}` : ""}</p>
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-[1.75rem] sm:leading-8">{page?.title ?? "FINIX"}</h1>
        </div>
        <div className="order-3 flex w-full items-center gap-2 sm:order-none sm:w-auto sm:flex-none">
          <form role="search" className="relative min-w-0 flex-1 sm:w-56 sm:flex-none lg:w-52 xl:w-72" onSubmit={e => { e.preventDefault(); if (pathname !== "/transactions") router.push("/transactions"); }}>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={searchRef} type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" aria-label="Search transactions" className="pl-9 pr-12" />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:block">⌘K</kbd>
          </form>
          <DateRangePicker className="w-[10.5rem] shrink-0 sm:w-44 lg:w-40 xl:w-44" />
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <LiveIndicator className="hidden xl:inline-flex" />
          <ThemeToggle />
          <NotificationsPopover />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
