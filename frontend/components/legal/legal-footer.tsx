import Link from "next/link";
import { Logo } from "@/components/layout/logo";

const link = "inline-flex min-h-11 items-center rounded-md underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring";

export function LegalFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-[13px] text-muted-foreground sm:flex-row sm:px-8">
        <Logo />
        <nav aria-label="Legal information" className="flex flex-wrap items-center justify-center gap-x-5">
          <Link href="/privacy" className={link}>Privacy Policy</Link>
          <Link href="/terms" className={link}>Terms of Service</Link>
        </nav>
        <p>© {new Date().getFullYear()} FINIX. Development sandbox.</p>
      </div>
    </footer>
  );
}
