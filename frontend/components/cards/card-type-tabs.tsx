"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/paceui/motion/tabs";
import type { Card, CardType } from "@/types/cards";

const LABEL: Record<CardType, string> = { EVERYDAY: "Black · Everyday", SAVINGS: "Silver · Savings" };

/** Switches between the card types the customer actually has. Selecting a type selects their first card of that type. */
export function CardTypeTabs({ cards, selected, onSelect }: { cards: Card[]; selected?: Card; onSelect: (id: string) => void }) {
  const types = (["EVERYDAY", "SAVINGS"] as CardType[]).filter(t => cards.some(c => c.cardType === t));
  if (types.length < 2 || !selected) return null;
  return (
    <Tabs value={selected.cardType} onValueChange={v => { const next = cards.find(c => c.cardType === v); if (next) onSelect(next.id); }} className="mx-auto">
      <TabsList aria-label="Card type" className="mx-auto">
        {types.map(t => <TabsTrigger key={t} value={t}>{LABEL[t]}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}
