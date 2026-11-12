import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { isDemoAuthEnabled } from "@/lib/server/demo-auth";
import { LiveProvider } from "@/providers/live-provider";
import { FiltersProvider } from "@/providers/filters-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "FINIX — Core Banking",
  icons: { icon: [{ url: "/finix-icon.svg", type: "image/svg+xml" }] },
  description: "Ledger-backed banking dashboard with secure internal transfers.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider demoAvailable={isDemoAuthEnabled()}>
              <LiveProvider>
                <FiltersProvider>
                  {children}
                  <Toaster />
                </FiltersProvider>
              </LiveProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
