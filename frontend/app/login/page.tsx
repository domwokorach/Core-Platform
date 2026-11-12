import type { Metadata } from "next";
import { LoginLayout } from "@/components/auth/login-layout";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in | FINIX",
  description: "Securely sign in to your FINIX banking dashboard.",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[]; error?: string | string[] }> }) {
  const sp = await searchParams;
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  return <LoginLayout><LoginForm returnTo={first(sp.returnTo)} initialError={first(sp.error)} /></LoginLayout>;
}
