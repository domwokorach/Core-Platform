"use client";

import { motion, useReducedMotion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";

const ease = [0.22, 1, 0.36, 1] as const;

export function BrandPanel() {
  const reduce = useReducedMotion();
  const rise = (delay: number) => reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease, delay } };
  return (
    <aside aria-label="About FINIX" className="relative hidden w-[46%] shrink-0 overflow-hidden bg-[#000000] text-white sm:flex sm:w-[40%] lg:w-[46%]">
      {/* Grid texture */}
      <div aria-hidden className="absolute inset-0 opacity-[0.55] [background-image:linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(80%_70%_at_30%_35%,#000,transparent)]" />
      {/* Monochrome highlights */}
      <div aria-hidden className="absolute -right-40 -top-40 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.14),transparent)]" />
      <div aria-hidden className="absolute -bottom-52 -left-32 size-[32rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.07),transparent)]" />
      {/* Layered shapes and animated lines */}
      <svg aria-hidden viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <g fill="none" stroke="#fff" strokeLinecap="round">
          <motion.path d="M-20 560 C 140 520, 220 640, 380 590 S 560 470, 640 500" strokeOpacity="0.28" strokeWidth="1"
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease, delay: 0.3 }} />
          <motion.path d="M-20 610 C 150 570, 240 690, 390 640 S 570 520, 640 550" strokeOpacity="0.14" strokeWidth="1"
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, ease, delay: 0.5 }} />
          <motion.path d="M-20 660 C 160 620, 260 740, 400 690 S 580 570, 640 600" strokeOpacity="0.08" strokeWidth="1"
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease, delay: 0.7 }} />
          <motion.circle cx="470" cy="190" r="110" strokeOpacity="0.16"
            initial={reduce ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease, delay: 0.2 }} />
          <circle cx="470" cy="190" r="70" strokeOpacity="0.1" />
          <circle cx="470" cy="190" r="30" strokeOpacity="0.2" />
        </g>
        <rect x="360" y="300" width="170" height="106" rx="14" fill="#fff" fillOpacity="0.03" stroke="#fff" strokeOpacity="0.14" transform="rotate(-8 445 353)" />
        <rect x="330" y="330" width="170" height="106" rx="14" fill="#fff" fillOpacity="0.05" stroke="#fff" strokeOpacity="0.2" transform="rotate(-8 415 383)" />
      </svg>

      <div className="relative z-10 flex w-full flex-col justify-between p-8 lg:p-14 xl:p-16">
        <motion.div {...(reduce ? {} : { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease } })} className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="size-9" aria-hidden>
            <rect width="32" height="32" rx="9" fill="#fff" />
            <path d="M9 23V9h13v3.6H13.2v2.2h7.1v3.4h-7.1V23H9Z" fill="#000" />
            <circle cx="23.5" cy="23" r="2.6" fill="#737373" />
          </svg>
          <span className="text-xl font-semibold tracking-[-0.03em]">FINIX</span>
        </motion.div>

        <div className="max-w-md">
          <motion.h2 {...rise(0.15)} className="text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.03em] lg:text-[2.75rem]">
            Your money. Your future. Your FINIX.
          </motion.h2>
          <motion.p {...rise(0.25)} className="mt-5 max-w-sm text-pretty text-[15px] leading-relaxed text-[#a3a3a3] lg:text-base">
            Experience a smarter way to manage your finances with clarity, confidence and control.
          </motion.p>
          <motion.div {...rise(0.35)} className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs text-[#d4d4d4]">
            <ShieldCheck className="size-3.5" aria-hidden />Protected by secure authentication
          </motion.div>
        </div>

        <motion.p {...rise(0.45)} className="text-sm text-[#a3a3a3]">Designed for the way you bank.</motion.p>
      </div>
    </aside>
  );
}
