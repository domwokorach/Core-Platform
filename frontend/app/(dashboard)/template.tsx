"use client";

import { motion } from "motion/react";
import { ease } from "@/lib/animations/variants";

/** Re-mounts per navigation: a gentle 320ms fade-up between pages. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease }}>{children}</motion.div>;
}
