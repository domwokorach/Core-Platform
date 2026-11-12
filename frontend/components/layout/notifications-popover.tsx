"use client";

import Link from "next/link";
import { ArrowRightLeft, Bell, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTransfers } from "@/hooks/use-banking";
import { useLiveState } from "@/providers/live-provider";
import { dateLong, money } from "@/lib/utils/format";
import { useAuth } from "@/providers/auth-provider";
import { RecentPayments } from "@/components/banking/recent-payments";

/** Notifications are derived from real committed transfers plus connection state; nothing is fabricated. */
export function NotificationsPopover() {
  const { user } = useAuth();
  const live = useLiveState();
  const { data: transfers = [], isDemo } = useTransfers();
  const recent = transfers.slice(0, 3);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications${recent.length ? `, ${recent.length} recent` : ""}`} className="relative">
          <Bell className="size-[18px]" />
          {recent.length > 0 && !isDemo && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-brand ring-2 ring-card" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex items-center justify-between border-b px-4 py-3"><strong className="text-sm">Notifications</strong><Link href="/notifications" className="text-xs font-medium text-brand-text hover:underline">View all</Link></div>
        <ul className="max-h-80 divide-y overflow-y-auto">
          <li className="flex gap-3 px-4 py-3 text-sm">
            <Radio className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{!user ? "Demo preview — sign in to see live account activity." : live === "live" ? "Live updates are connected." : "Live updates are not connected. Data refreshes when the connection returns."}</span>
          </li>
          {recent.map(t => (
            <li key={t.id} className="flex gap-3 px-4 py-3 text-sm">
              <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-brand-text" />
              <span><span className="font-medium num">{money(t.amountMinor, t.currency)}</span> transferred<span className="block text-xs text-muted-foreground">{t.reference} · {dateLong(t.createdAt)}</span></span>
            </li>
          ))}
        </ul>
        <div className="border-t"><RecentPayments limit={2} dense /></div>
      </PopoverContent>
    </Popover>
  );
}
