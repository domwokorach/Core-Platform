"use client";

import { useEffect, useRef, useState } from "react";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoUrl } from "@/lib/logo";
import type { Merchant } from "@/types/banking";

const SIZES = {
  /** 36px mobile · 40px tablet · 44px desktop */
  md: "size-9 sm:size-10 lg:size-11",
  sm: "size-8",
  lg: "size-14",
} as const;

type Status = "loading" | "loaded" | "error";

/**
 * Real merchant brand logo with graceful degradation.
 *  - URL comes only from a verified domain (see lib/logo.ts); no token/unsafe domain → neutral icon, no request.
 *  - `object-contain` inside a fixed neutral tile: logos are never stretched, cropped, filtered or recoloured.
 *  - White tile in both themes so brand artwork keeps its authentic colours in dark mode.
 *  - Loading shimmer → opacity fade-in; any error (404, 401, 429, offline) → Store icon. Never a broken image.
 * Logo failures are cosmetic only: this component has no effect on financial data or calls.
 */
export function MerchantLogo({ merchant, name, size = "md", className }: { merchant?: Merchant | null; name: string; size?: keyof typeof SIZES; className?: string }) {
  const src = logoUrl(merchant?.domain);
  const [status, setStatus] = useState<Status>(src ? "loading" : "error");
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => { setStatus(src ? "loading" : "error"); }, [src]);
  // The image may already be complete (browser cache) before React attaches onLoad.
  useEffect(() => {
    const el = img.current;
    // Only a decoded image counts. Deferred lazy images report complete=true with naturalWidth=0, which is NOT an error;
    // real failures arrive through onError.
    if (el?.complete && el.naturalWidth > 0) setStatus("loaded");
  }, [src]);

  return (
    <span
      data-merchant-logo={merchant?.id ?? "fallback"}
      data-logo-status={status}
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm dark:border-white/15", SIZES[size], className)}
    >
      {src && status !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element -- third-party CDN logo with onError fallback; next/image would proxy it
        <img
          ref={img}
          key={src}
          src={src}
          alt={`${merchant?.name ?? name} logo`}
          width={128}
          height={128}
          loading={size === "lg" ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={cn("size-full object-contain p-1.5 transition-opacity duration-300", status === "loaded" ? "opacity-100" : "opacity-0")}
        />
      )}
      {status === "loading" && <span aria-hidden className="absolute inset-0 animate-pulse bg-neutral-200" />}
      {status === "error" && <Store aria-hidden className="size-[45%] text-neutral-500" />}
    </span>
  );
}
