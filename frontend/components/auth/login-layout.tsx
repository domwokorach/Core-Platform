import { BrandPanel } from "./brand-panel";

/** Split-screen shell: dark brand panel (≥640px) + a pure-white authentication area. */
export function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="force-light flex min-h-dvh bg-background text-foreground">
      <a href="#signin" className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to sign in</a>
      <BrandPanel />
      <main id="signin" tabIndex={-1} className="relative flex min-w-0 flex-1 flex-col outline-none">
        {children}
      </main>
    </div>
  );
}
