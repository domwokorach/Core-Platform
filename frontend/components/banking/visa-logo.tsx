"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { logoUrl } from "@/lib/logo";

/**
 * Visa branding is off unless explicitly approved. FINIX is not a Visa issuer, and `account.brand` is a database
 * default (every account, including internal ones, carries it), so it is never treated as proof of a Visa product.
 * Set NEXT_PUBLIC_VISA_BRANDING_APPROVED=true only for a real issuer relationship or a Visa-authorised design demo.
 */
export const VISA_BRANDING_APPROVED = process.env.NEXT_PUBLIC_VISA_BRANDING_APPROVED === "true";

/**
 * Renders the official Visa asset supplied from Visa's brand centre (https://www.visa.com/), never a recreation.
 * Files: public/brand/visa-white.svg (reversed, for dark cards) and public/brand/visa-blue.svg (for light cards).
 * Until the file exists, `fallback` (a neutral, network-free mark) is shown instead.
 */
export function VisaLogo({ tone = "white", className, fallback = null }: { tone?: "white" | "blue"; className?: string; fallback?: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // Official asset first; if it is not in public/brand, fall back to Logo.dev's rendering of visa.com (third party, not Visa-supplied).
  const [src, setSrc] = useState(`/brand/visa-${tone}.svg`);
  const remote = logoUrl("visa.com", 128);
  if (failed) return <>{fallback}</>;
  return (
    <>
      {!loaded && fallback}
      {/* Plain <img>: the asset is a static brand SVG that must not be re-encoded or resized by an optimiser. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src} alt="Visa" onLoad={() => setLoaded(true)}
        onError={() => (remote && src !== remote ? setSrc(remote) : setFailed(true))}
        className={cn("h-5 w-auto max-w-16 shrink-0 object-contain sm:h-[22px]", !loaded && "hidden", className)}
      />
    </>
  );
}
