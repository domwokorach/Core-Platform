"use client";

import { CARD_DESIGNS, DesignerCard, type CardDesign } from "@/components/banking/designer-card";

const ORDER: CardDesign[] = ["everyday", "savings", "metal", "signature"];

/** Decorative collection of FINIX card designs. Fictional details, no balances; these are not issued cards. */
export function CardDesignGallery() {
  return (
    <section aria-labelledby="card-designs-title" className="mt-10">
      <h2 id="card-designs-title" className="text-lg font-semibold tracking-tight">Card designs</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        The FINIX design collection. These are decorative concepts with fictional details: they are not issued cards, carry no balances and imply no payment-network affiliation.
      </p>
      <ul className="mt-5 grid gap-6 sm:grid-cols-2" aria-label="FINIX card designs">
        {ORDER.map(design => (
          <li key={design} className="min-w-0">
            <DesignerCard design={design} />
            <p className="mt-3 text-sm font-medium">{CARD_DESIGNS[design].name}</p>
            <p className="text-sm text-muted-foreground">{CARD_DESIGNS[design].description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
