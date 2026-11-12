import type { Metadata } from "next";
import { LoginLayout } from "@/components/auth/login-layout";
import { LoginForm } from "@/components/auth/login-form";
import { isDemoAuthEnabled } from "@/lib/server/demo-auth";
import { getDevAccount } from "@/lib/server/dev-account";

export const metadata: Metadata = {
  title: "FINIX — Core Banking",
  description: "Securely sign in to your FINIX banking dashboard.",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[]; error?: string | string[]; signedOut?: string | string[]; login_hint?: string | string[] }> }) {
  const sp = await searchParams;
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  return <LoginLayout><LoginForm returnTo={first(sp.returnTo)} initialError={first(sp.error)} signedOut={Boolean(first(sp.signedOut))} loginHint={first(sp.login_hint)} demoEnabled={isDemoAuthEnabled()} devAccount={getDevAccount()} /></LoginLayout>;
}
