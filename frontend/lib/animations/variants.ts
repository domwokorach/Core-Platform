import type { Transition, Variants } from "motion/react";

/** Shared motion tokens. Durations follow the FINIX motion guide: hover 120–180ms, cards 200–300ms, pages 250–400ms. */
export const ease = [0.22, 1, 0.36, 1] as const;
export const durations = { hover: 0.15, control: 0.2, card: 0.28, page: 0.32 } as const;
export const spring: Transition = { type: "spring", stiffness: 420, damping: 36 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: durations.card, ease } },
};
export const stagger = (delay = 0.05): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: 0.04 } },
});
export const rowEnter: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease } },
};
