"use client";

import { Info, Snowflake } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/paceui/motion/alert";
import type { Card } from "@/types/cards";

/** Status notice for a card, from its real status. Active cards need no notice; blocked/closed cards keep the existing note. */
export function CardStatusAlert({ card }: { card: Card }) {
  if (card.status === "PENDING_ACTIVATION") return (
    <Alert role="status"><Info aria-hidden /><AlertTitle>Activation needed</AlertTitle><AlertDescription>Activate this card before it can accept sandbox authorizations.</AlertDescription></Alert>
  );
  if (card.status === "FROZEN") return (
    <Alert role="status"><Snowflake aria-hidden /><AlertTitle>Card is frozen</AlertTitle><AlertDescription>All sandbox authorizations are declined until you unfreeze it. Your account and balances are not affected.</AlertDescription></Alert>
  );
  return null;
}
