import type { Metadata } from "next";
import { LoginLayout } from "@/components/auth/login-layout";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "FINIX — Core Banking",
  description: "Create your FINIX account securely.",
  robots: { index: false },
};

/** Entry point for self-registration. Credentials are only ever collected on the FINIX-themed Keycloak registration page. */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[]; error?: string | string[] }> }) {
  const sp = await searchParams;
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  return <LoginLayout><LoginForm register returnTo={first(sp.returnTo)} initialError={first(sp.error)} /></LoginLayout>;
}
