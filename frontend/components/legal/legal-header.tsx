import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function LegalHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/login" aria-label="FINIX home" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><Logo /></Link>
        <div className="flex items-center gap-1">
          <Link href="/login" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="size-4" aria-hidden />Back to Sign In
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
