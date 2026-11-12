"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Non-sensitive copy only. Never reveals whether an account exists. */
export const AUTH_ERRORS = {
  failed: { title: "We couldn't sign you in", body: "Please check your details and try again." },
  callback: { title: "We couldn't complete sign-in", body: "Your session could not be verified. Please try again." },
  timeout: { title: "Unable to sign in", body: "Your sign-in session has expired. Please try again." },
  expired: { title: "Your session has ended", body: "For your security you were signed out. Please sign in again." },
  denied: { title: "Sign-in was cancelled", body: "You can try again whenever you are ready." },
  forbidden: { title: "This account can't access FINIX", body: "Your sign-in worked, but this account isn't authorised for online banking. Contact support if you think this is a mistake." },
  backend: { title: "Banking services are unavailable", body: "You're signed in, but we couldn't reach your accounts. Please try again shortly." },
  unavailable: { title: "Unable to sign in", body: "We're unable to sign you in right now. Please try again shortly." },
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
            <Alert className="mb-5 border-red-200 bg-red-50 text-red-900">
              <AlertCircle aria-hidden className="text-red-600" />
              <div><AlertTitle className="text-red-800">{copy.title}</AlertTitle><AlertDescription className="text-red-900">{copy.body}</AlertDescription></div>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
