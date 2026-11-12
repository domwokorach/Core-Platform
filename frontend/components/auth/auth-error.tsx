"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Non-sensitive copy only. Never reveals whether an account exists. */
export const AUTH_ERRORS = {
  failed: { title: "We couldn't sign you in", body: "Please check your details and try again." },
  callback: { title: "We couldn't complete sign-in", body: "Your session could not be verified. Please try again." },
  unavailable: { title: "Sign-in is temporarily unavailable", body: "We couldn't reach the secure sign-in service. Please try again shortly." },
} as const;
export type AuthErrorKey = keyof typeof AUTH_ERRORS;

export function AuthError({ error }: { error?: AuthErrorKey | null }) {
  const reduce = useReducedMotion();
  const copy = error ? AUTH_ERRORS[error] : null;
  return (
    // The live region stays mounted so screen readers announce content as it appears.
    <div role="alert" aria-live="assertive">
      <AnimatePresence initial={false}>
        {copy && (
          <motion.div
            key={error}
            initial={reduce ? false : { opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <Alert className="mb-5 border-[#171717] bg-white">
              <AlertCircle aria-hidden />
              <div><AlertTitle>{copy.title}</AlertTitle><AlertDescription>{copy.body}</AlertDescription></div>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
