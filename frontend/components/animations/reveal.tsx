"use client";

import { motion } from "motion/react";
import { fadeUp, stagger } from "@/lib/animations/variants";
import { cn } from "@/lib/utils";

/** Staggered entrance container. Children use <RevealItem>. Opacity/transform only. */
export function RevealGroup({ className, delay, ...p }: React.ComponentProps<typeof motion.div> & { delay?: number }) {
  return <motion.div className={className} variants={stagger(delay)} initial="hidden" animate="show" {...p} />;
}
export function RevealItem({ className, ...p }: React.ComponentProps<typeof motion.div>) {
  return <motion.div className={cn("min-w-0", className)} variants={fadeUp} {...p} />;
}
