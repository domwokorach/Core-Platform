"use client";

import { Wallet } from "lucide-react";
import { AccountCard } from "@/components/banking/account-card";
import { EmptyState } from "@/components/banking/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Dashboard } from "@/types/banking";

/** Swipeable (scroll-snap) on mobile, stacked grid on wider screens. */
export function AccountsCarousel({ data, loading }: { data?: Dashboard; loading?: boolean }) {
  if (loading || !data) return <Skeleton className="aspect-[1.6/1] w-full rounded-2xl" />;
  if (!data.accounts.length) return <EmptyState icon={Wallet} title="No accounts yet" description="Your accounts will appear here once they’re opened." />;
  return (
    <div role="region" aria-label="Your accounts" tabIndex={0} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-1 xl:gap-4 xl:pb-0">
      {data.accounts.map((a, i) => (
        <div key={a.id} className="w-[82%] shrink-0 snap-center sm:w-auto">
          <AccountCard account={a} holder={data.customerName} variant={i % 2 ? "teal" : "navy"} type={a.displayName} showBalance={false} />
        </div>
      ))}
    </div>
  );
}
