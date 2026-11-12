"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Nfc } from "lucide-react";
import { cn } from "@/lib/utils";
import { VISA_BRANDING_APPROVED, VisaLogo } from "./visa-logo";

export type CardDesign = "everyday" | "savings" | "metal" | "signature";

/** The four FINIX designs. `light` designs use dark artwork and text; the rest use white. Decorative only. */
export const CARD_DESIGNS: Record<CardDesign, { name: string; description: string; light: boolean; surface: string }> = {
  everyday: { name: "Everyday", description: "Matte black with a fine graphite grid.", light: false, surface: "card-matte" },
  savings: { name: "Savings", description: "Pearl white with silver concentric rings.", light: true, surface: "card-pearl" },
  metal: { name: "Metal", description: "Brushed titanium with a bevelled edge.", light: true, surface: "card-titanium" },
  signature: { name: "Signature", description: "Smoked glass with a single silver sweep.", light: false, surface: "card-smoke" },
};

function Artwork({ design, line }: { design: CardDesign; line: string }) {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 400 250" preserveAspectRatio="xMaxYMid slice" fill="none" stroke={line} strokeWidth="1">
      {design === "everyday" && <path opacity=".07" d="M0 50H400M0 100H400M0 150H400M0 200H400M50 0V250M110 0V250M170 0V250M230 0V250M290 0V250M350 0V250" />}
      {design === "savings" && <g opacity=".22"><circle cx="330" cy="60" r="150" /><circle cx="330" cy="60" r="105" /><circle cx="330" cy="60" r="60" /><path d="M0 220L400 90M0 245L400 115" /></g>}
      {design === "metal" && <g opacity=".18"><path d="M0 0L400 250" /><path d="M60 0L400 212" /><circle cx="360" cy="215" r="70" /></g>}
      {design === "signature" && <path opacity=".5" d="M-10 230C110 120 230 210 410 60" strokeWidth="1.2" />}
    </svg>
  );
}

/**
 * Decorative FINIX bank-card artwork. NOT an issued card: the number, holder and currency are fictional and no balance is shown.
 * A payment-network mark (Visa) appears only when VISA_BRANDING_APPROVED is true and the official asset is present; otherwise a
 * neutral "Demo card" pill is shown, so nothing implies a real card programme. Hover tilt is subtle and disabled for reduced motion.
 */
export function DesignerCard({ design, cardholder = "A. MORGAN", last4 = "4821", currency = "GBP", className }: {
  design: CardDesign; cardholder?: string; last4?: string; currency?: string; className?: string;
}) {
  const { name, light, surface } = CARD_DESIGNS[design];
  const reduce = useReducedMotion();
  const line = light ? "#171717" : "#ffffff";
  const muted = light ? "text-neutral-700" : "text-white/65";

  // Pointer-driven tilt (max ±5°), springy and capped; touch and reduced-motion users get a static card.
  const px = useMotionValue(0), py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-5, 5]), { stiffness: 220, damping: 22 });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [5, -5]), { stiffness: 220, damping: 22 });

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5); py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { px.set(0); py.set(0); };
  const pill = <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ring-1", light ? "text-neutral-700 ring-neutral-900/25" : "text-white/75 ring-white/25")}>Demo card</span>;

  return (
    <motion.div
      role="group" aria-label={`${name} card design, ${currency}, number ending ${last4}`} data-card-design={design}
      initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onPointerMove={onMove} onPointerLeave={onLeave}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      className={cn(
        "relative flex aspect-[1.586/1] w-full min-w-[15rem] select-none flex-col justify-between overflow-hidden rounded-2xl p-5 shadow-lift ring-1 sm:p-6",
        surface, light ? "text-neutral-900 ring-neutral-900/15" : "text-white ring-white/12", className,
      )}
    >
      <Artwork design={design} line={line} />
      <div className="relative flex items-start justify-between">
        <p className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.03em]">
          <svg aria-hidden viewBox="0 0 32 32" className="size-5"><rect width="32" height="32" rx="9" fill={line} /><path d="M9 23V9h13v3.6H13.2v2.2h7.1v3.4h-7.1V23H9Z" fill={light ? "#fafafa" : "#0a0a0a"} /><circle cx="23.5" cy="23" r="2.6" fill="#737373" /></svg>
          FINIX
        </p>
        <Nfc className={cn("size-5 rotate-90", muted)} aria-hidden />
      </div>
      <div className="relative">
        <span aria-hidden className="mb-3 block h-7 w-10 rounded-md bg-gradient-to-br from-neutral-100 via-neutral-400 to-neutral-500 ring-1 ring-black/10" />
        <p className="num text-[15px] font-medium tracking-[0.2em] sm:text-base">•••• •••• •••• {last4}</p>
      </div>
      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-[9px] uppercase tracking-[0.18em]", muted)}>Cardholder</p>
          <p className="truncate text-[13px] font-medium uppercase tracking-[0.08em]">{cardholder}</p>
          <p className={cn("text-[11px]", muted)}>{currency}</p>
        </div>
        {VISA_BRANDING_APPROVED ? <VisaLogo tone={light ? "blue" : "white"} fallback={pill} className="h-7 sm:h-8" /> : pill}
      </div>
    </motion.div>
  );
}
