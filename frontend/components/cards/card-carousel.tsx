"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CARD_STATUS, CardStatusBadge } from "./card-status";
import type { Card } from "@/types/cards";

/** The supplied FINIX Visa artwork, shown whole (never cropped or stretched). Everyday → Black, Savings → Silver. */
const ART = {
  EVERYDAY: { name: "FINIX Black Visa", src: "/cards/finix-visa-black.png", width: 1448, height: 1086 },
  SAVINGS: { name: "FINIX Silver Visa", src: "/cards/finix-visa-silver-cutout.png", width: 1447, height: 1087 },
} as const;

/** Swipeable, scroll-snapping carousel. Native scrolling handles touch; the slide nearest the centre becomes the selection. */
export function CardCarousel({ cards, selectedId, onSelect }: { cards: Card[]; selectedId?: string; onSelect: (id: string) => void }) {
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const index = Math.max(0, cards.findIndex(c => c.id === selectedId));

  const slides = () => Array.from(track.current?.children ?? []) as HTMLElement[];
  const goTo = useCallback((i: number, smooth = true) => {
    const el = slides()[i];
    if (!el || !track.current) return;
    const t = track.current;
    t.scrollTo({ left: el.offsetLeft - (t.clientWidth - el.clientWidth) / 2, behavior: smooth && !reduce ? "smooth" : "auto" });
  }, [reduce]);

  // Keep the selected slide centred when selection changes elsewhere (e.g. a card was just created).
  useEffect(() => { goTo(index, false); }, [index, goTo]);

  const onScroll = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const t = track.current; if (!t) return;
      const mid = t.scrollLeft + t.clientWidth / 2;
      let best = 0, dist = Infinity;
      slides().forEach((el, i) => { const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
      if (cards[best] && cards[best].id !== selectedId) onSelect(cards[best].id);
    }, 90);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  // Glare follows the mouse only (touch and pen skip it).
  const glareMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const g = e.currentTarget.querySelector<HTMLElement>("[data-glare]"); if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`); g.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`); g.style.opacity = "1";
  };
  const glareLeave = (e: React.PointerEvent<HTMLElement>) => { const g = e.currentTarget.querySelector<HTMLElement>("[data-glare]"); if (g) g.style.opacity = "0"; };

  const step = (d: number) => { const i = Math.min(cards.length - 1, Math.max(0, index + d)); onSelect(cards[i].id); goTo(i); };

  return (
    <div className="relative" style={{ "--slide": "min(78vw, 24rem)" } as React.CSSProperties}>
      <div
        ref={track}
        role="list"
        aria-label="Your virtual cards"
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-[calc(50%-var(--slide)/2)] pb-6 pt-3 scrollbar-none motion-reduce:scroll-auto"
      >
        {cards.map(c => {
          const art = ART[c.cardType] ?? ART.EVERYDAY;
          const status = CARD_STATUS[c.status];
          const active = c.id === selectedId;
          const dim = c.status === "FROZEN" || c.status === "BLOCKED" || c.status === "CLOSED";
          return (
            <div role="listitem" key={c.id} className="w-[var(--slide)] shrink-0 snap-center">
              <motion.button
                type="button"
                onClick={() => { onSelect(c.id); goTo(cards.indexOf(c)); }}
                aria-pressed={active}
                onPointerMove={glareMove} onPointerLeave={glareLeave}
                aria-label={`${c.linkedAccount.displayName} virtual card, reference ${c.maskedReference}, ${status.label}`}
                animate={{ scale: active ? 1 : 0.9 }}
                transition={{ duration: reduce ? 0 : 0.25, ease: "easeOut" }}
                className="block w-full rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {/* The supplied artwork is shown whole (transparent PNG, original proportions); the shadow follows the card's own shape. */}
                <span className="relative block">
                  <Image src={art.src} alt={`${art.name} card`} width={art.width} height={art.height} sizes="(min-width: 640px) 384px, 78vw" priority
                    className={cn("block h-auto w-full transition-[filter,opacity] duration-300", active ? "drop-shadow-[0_20px_26px_rgb(0_0_0/0.30)]" : "drop-shadow-none", (dim || !active) && "opacity-60")} />
                  {/* Subtle pointer-tracked glare (inspired by Aceternity's glare card), masked to the card shape. Mouse only, active card only, off for reduced motion. */}
                  {active && !reduce && (
                    <span aria-hidden data-glare className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
                      style={{ background: "radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgb(255 255 255 / 0.34), transparent 46%)", mixBlendMode: "soft-light", maskImage: `url(${art.src})`, WebkitMaskImage: `url(${art.src})`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }} />
                  )}
                </span>
              </motion.button>
              <div className={cn("mt-3 text-center transition-opacity duration-300", active ? "opacity-100" : "opacity-60")}>
                <p className="text-sm font-medium">{art.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.linkedAccount.displayName} · <span className="num">{c.maskedReference}</span></p>
                <div className="mt-2 flex items-center justify-center gap-2"><CardStatusBadge status={c.status} /><span className="text-[11px] uppercase tracking-wider text-muted-foreground">Virtual · Sandbox</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {cards.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-1/3 hidden -translate-y-1/2 justify-between px-2 sm:flex">
            <Button type="button" variant="outline" size="icon" className="pointer-events-auto rounded-full bg-background" onClick={() => step(-1)} disabled={index === 0} aria-label="Previous card"><ChevronLeft /></Button>
            <Button type="button" variant="outline" size="icon" className="pointer-events-auto rounded-full bg-background" onClick={() => step(1)} disabled={index === cards.length - 1} aria-label="Next card"><ChevronRight /></Button>
          </div>
          <div className="flex justify-center gap-1.5" aria-hidden>
            {cards.map((c, i) => <span key={c.id} className={cn("h-1.5 rounded-full bg-foreground transition-all duration-300", i === index ? "w-5" : "w-1.5 opacity-25")} />)}
          </div>
        </>
      )}
    </div>
  );
}
