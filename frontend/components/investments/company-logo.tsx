"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoUrl } from "@/lib/logo";

/** Verified ticker → company domain. Logo.dev is used for brand imagery only; prices always come from the market provider. */
export const STOCK_DOMAINS: Record<string, string> = {
  AAPL: "apple.com",
  MSFT: "microsoft.com",
  NVDA: "nvidia.com",
  NFLX: "netflix.com",
};

const SIZES = {
  /** 36px mobile · 40px tablet · 44px desktop */
  md: "size-9 sm:size-10 lg:size-11",
  sm: "size-8",
  lg: "size-12",
} as const;

type Status = "loading" | "loaded" | "error";

/**
 * Real company logo for a stock ticker or mapped domain, with graceful degradation (cosmetic only; never affects quotes).
 *  - Unknown ticker, missing token or secret key → neutral icon, no network request.
 *  - `object-contain` in a white tile in both themes, so brand colours are untouched in dark mode.
 *  - Skeleton → fade-in; any failure (404, 401, 429, offline) → neutral Building2 icon.
 */
export function CompanyLogo({ symbol, domain: mappedDomain, name, size = "md", className }: { symbol?: string; domain?: string; name: string; size?: keyof typeof SIZES; className?: string }) {
  // A verified ticker wins; an explicit domain is still validated by logoUrl(), so arbitrary URLs can never be requested.
  const domain = (symbol && STOCK_DOMAINS[symbol.toUpperCase()]) || mappedDomain;
  const src = logoUrl(domain);
  const [status, setStatus] = useState<Status>(src ? "loading" : "error");
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => { setStatus(src ? "loading" : "error"); }, [src]);
  // The image may already be decoded (browser cache) before React attaches onLoad.
  useEffect(() => { if (img.current?.complete && img.current.naturalWidth > 0) setStatus("loaded"); }, [src]);

  return (
    <span
      data-stock-logo={symbol ?? domain ?? "unknown"}
      data-logo-status={status}
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm dark:border-white/15", SIZES[size], className)}
    >
      {src && status !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element -- third-party CDN logo with onError fallback; next/image would proxy it
        <motion.img
          ref={img}
          key={src}
          src={src}
          alt={`${name} logo`}
          width={128}
          height={128}
          loading="lazy"
          decoding="async"
          initial={false}
          animate={{ opacity: status === "loaded" ? 1 : 0, scale: status === "loaded" ? 1 : 0.96 }}
          transition={{ duration: 0.3 }}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className="size-full object-contain p-1.5"
        />
      )}
      {status === "loading" && <span aria-hidden className="absolute inset-0 animate-pulse bg-neutral-200" />}
      {status === "error" && <Building2 aria-hidden className="size-[45%] text-neutral-500" />}
    </span>
  );
}
