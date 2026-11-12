"use client";

import { useState } from "react";
import { CreditCard, Info, Plus } from "lucide-react";
import { toast } from "sonner";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";
import { EmptyState } from "@/components/banking/empty-state";
import { ErrorState } from "@/components/banking/error-state";
import { CardManager } from "@/components/cards/card-manager";
import { CreateCardDialog } from "@/components/cards/create-card-dialog";
import { VirtualCard } from "@/components/cards/virtual-card";
import { CardDesignGallery } from "@/components/cards/card-design-gallery";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-banking";
import { useCards, useCardsLive } from "@/hooks/use-cards";
import { useAuth } from "@/providers/auth-provider";

export default function CardsPage() {
  const { user } = useAuth();
  useCardsLive();
  const { data: cards = [], isLoading, error, refetch, isFetching } = useCards();
  const { data: accounts = [] } = useAccounts();
  const [selectedId, setSelectedId] = useState<string>();
  const [creating, setCreating] = useState(false);
  const selected = cards.find(c => c.id === selectedId) ?? cards[0];

  const create = () => { if (!user) { toast.info("Sign in to create sandbox cards."); return; } setCreating(true); };
  const createButton = <Button onClick={create} className="max-sm:h-12 max-sm:w-full"><Plus />Create Virtual Card</Button>;

  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} retrying={isFetching} />;

  return (
    <RevealGroup className="space-y-5">
      <RevealItem className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p role="note" className="flex max-w-2xl items-start gap-2.5 rounded-xl border bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>Virtual cards here are <strong className="font-semibold text-foreground">development-sandbox cards</strong>. They have no real card number, can’t be used at real merchants or ATMs, and don’t move money. Real card issuing needs an authorised card provider.</span>
        </p>
        <div className="shrink-0">{createButton}</div>
      </RevealItem>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading cards">{[0, 1].map(i => <Skeleton key={i} className="aspect-[1.586/1] rounded-2xl" />)}</div>
      ) : !cards.length ? (
        <EmptyState icon={CreditCard} title="No virtual cards yet" description="Create a sandbox card linked to one of your accounts to try card controls, limits and activity." action={createButton} />
      ) : (
        <>
          <RevealItem>
            {/* Swipeable carousel on phones, grid from tablet up. Scrolling is contained here, so the page never scrolls sideways. */}
            <div role="list" aria-label="Your virtual cards" className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 pt-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 sm:pt-0 xl:grid-cols-3">
              {cards.map(c => (
                <div role="listitem" key={c.id} className="w-[min(85%,22rem)] shrink-0 snap-center sm:w-auto sm:shrink">
                  <VirtualCard card={c} selected={c.id === selected?.id} onSelect={() => setSelectedId(c.id)} />
                </div>
              ))}
            </div>
          </RevealItem>
          {selected && <RevealItem key={selected.id}><CardManager card={selected} /></RevealItem>}
        </>
      )}

      <CardDesignGallery />

      <CreateCardDialog open={creating} onClose={() => setCreating(false)} accounts={accounts} onCreated={c => setSelectedId(c.id)} />
    </RevealGroup>
  );
}
