"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRightLeft, Bell, CheckCheck, Radio } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/paceui/motion/alert";
import { ScrollArea, ScrollAreaViewport } from "@/components/paceui/motion/scroll-area";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RecentPayments } from "@/components/banking/recent-payments";
import { timeAgo, useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { dateLong, money } from "@/lib/utils/format";
import { useAuth } from "@/providers/auth-provider";
import { useLiveState } from "@/providers/live-provider";

const ORANGE = "#F97316";

/** Bell with an orange indicator, unread counter and a subtle ring when a new notification arrives (no motion if reduced). */
export function NotificationsPopover() {
  const { user } = useAuth();
  const live = useLiveState();
  const reduce = useReducedMotion();
  const { items, unread, ringKey, markRead, markAllRead } = useNotifications();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  const label = `Notifications${unread ? `, ${unread} unread` : ""}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="relative xl:w-auto xl:gap-2 xl:px-3" data-accent>
          <motion.span key={ringKey} className="inline-flex origin-top" style={{ color: ORANGE }}
            animate={ringKey > 0 && !reduce ? { rotate: [0, -16, 13, -9, 5, 0] } : undefined} transition={{ duration: 0.7, ease: "easeInOut" }}>
            <Bell className="size-[18px]" />
          </motion.span>
          <span className="hidden text-sm font-medium text-[#C2410C] dark:text-[#F97316] xl:inline">Notifications</span>
          {unread > 0 && (
            <motion.span key={unread} initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-neutral-950 ring-2 ring-background xl:static xl:ring-0"
              style={{ backgroundColor: ORANGE }} aria-hidden>{unread > 9 ? "9+" : unread}</motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <span className="sr-only" role="status" aria-live="polite">{ringKey > 0 && unread > 0 ? `${unread} unread notifications` : ""}</span>
      <PopoverContent>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <strong className="text-sm">Notifications</strong>
          <Link href="/notifications" className="text-xs font-medium text-brand-text hover:underline">View all</Link>
        </div>
        {unread > 0 && (
          <div className="border-b p-2">
            <Alert role="status" className="py-2.5" data-accent>
              <Bell aria-hidden style={{ color: ORANGE }} />
              <AlertTitle>{unread} unread {unread === 1 ? "notification" : "notifications"}</AlertTitle>
              <AlertDescription className="text-xs">New activity on your accounts.</AlertDescription>
              <AlertAction><Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllRead}><CheckCheck className="size-3.5" />Mark all read</Button></AlertAction>
            </Alert>
          </div>
        )}
        <ScrollArea className="max-h-80">
          <ScrollAreaViewport className="max-h-80">
            <ul className="divide-y">
              <li className="flex gap-3 px-4 py-3 text-sm">
                <Radio className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{!user ? "Demo preview — sign in to see live account activity." : live === "live" ? "Live updates are connected." : "Live updates are not connected. Data refreshes when the connection returns."}</span>
              </li>
              {items.slice(0, 8).map(t => (
                <li key={t.id}>
                  <button type="button" onClick={() => markRead(t.id)} aria-label={`${t.read ? "Read" : "Unread"}: ${money(t.amountMinor, t.currency)} transferred`}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted", !t.read && "bg-muted/50")}>
                    <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-brand-text" />
                    <span className="min-w-0 flex-1">
                      <span className={cn("num", t.read ? "font-normal" : "font-semibold")}>{money(t.amountMinor, t.currency)}</span> transferred
                      <span className="block truncate text-xs text-muted-foreground">{t.reference} · <time dateTime={t.createdAt} title={dateLong(t.createdAt)}>{now ? timeAgo(t.createdAt, now) : dateLong(t.createdAt)}</time></span>
                    </span>
                    {!t.read && <span data-accent className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: ORANGE }} aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          </ScrollAreaViewport>
        </ScrollArea>
        <div className="border-t"><RecentPayments limit={2} dense /></div>
      </PopoverContent>
    </Popover>
  );
}
