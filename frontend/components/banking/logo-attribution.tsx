import { logosEnabled } from "@/lib/logo";

/** Logo.dev's free plan requires a visible public link (https://www.logo.dev/docs/platform/attribution). Shown only when logos are enabled. */
export function LogoAttribution({ className }: { className?: string }) {
  if (!logosEnabled()) return null;
  return (
    <p className={className ?? "text-xs text-muted-foreground"}>
      <a href="https://logo.dev" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-foreground">Logos provided by Logo.dev</a>
      {" "}· Brand names and logos are trademarks of their respective owners and imply no endorsement.
    </p>
  );
}
