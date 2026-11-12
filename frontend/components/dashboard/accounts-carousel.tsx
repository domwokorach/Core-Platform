"use client";

import Image from "next/image";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/banking/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Dashboard } from "@/types/banking";

/** Same assignment as My Accounts: first account Black, second Silver, then repeating. */
const ART = [
  { name: "FINIX Black Visa", src: "/cards/finix-visa-black.png", width: 1448, height: 1086 },
  { name: "FINIX Silver Visa", src: "/cards/finix-visa-silver.png", width: 1447, height: 1087 },
] as const;

/** Swipeable (scroll-snap) on mobile, stacked grid on wider screens. Each card image is labelled with its account. */
export function AccountsCarousel({ data, loading }: { data?: Dashboard; loading?: boolean }) {
  if (loading || !data) return <Skeleton className="aspect-[1.33/1] w-full rounded-2xl" />;
  if (!data.accounts.length) return <EmptyState icon={Wallet} title="No accounts yet" description="Your accounts will appear here once they’re opened." />;
  return (
    <div role="region" aria-label="Your accounts" tabIndex={0} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-1 xl:gap-4 xl:pb-0">
      {data.accounts.map((a, i) => {
        const art = ART[i % ART.length];
        return (
          <figure key={a.id} className="m-0 w-[82%] shrink-0 snap-center sm:w-auto" aria-label={`${a.displayName}, ${art.name}, ${a.maskedNumber}`}>
            <div className="overflow-hidden rounded-2xl bg-black shadow-lift ring-1 ring-foreground/10">
              <Image src={art.src} alt={`${art.name} card`} width={art.width} height={art.height} sizes="(min-width: 1280px) 340px, (min-width: 640px) 45vw, 82vw" className="block h-auto w-full" />
            </div>
            <figcaption className="mt-2.5 px-1">
              <p className="text-sm font-semibold">{a.displayName}</p>
              <p className="num text-xs text-muted-foreground">{a.maskedNumber} · {a.currency}</p>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
