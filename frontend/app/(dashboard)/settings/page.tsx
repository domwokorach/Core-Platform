"use client";

import { Monitor, Moon, ShieldCheck, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const THEMES = [{ v: "light", l: "Light", i: Sun }, { v: "dark", l: "Dark", i: Moon }, { v: "system", l: "System", i: Monitor }] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardHeader><div><CardTitle>Appearance</CardTitle><CardDescription>Choose how FINIX looks on this device</CardDescription></div></CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
            {THEMES.map(({ v, l, i: Icon }) => (
              <button key={v} role="radio" aria-checked={mounted && theme === v} onClick={() => setTheme(v)} className={cn("flex h-20 flex-col items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors hover:bg-muted", mounted && theme === v && "border-brand bg-accent text-accent-foreground")}>
                <Icon className="size-5" />{l}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Animations follow your operating system’s “reduce motion” setting.</p>
        </CardContent>
      </Card>
      <Card id="security">
        <CardHeader><div><CardTitle>Security</CardTitle><CardDescription>How your session is protected</CardDescription></div></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p className="flex gap-2.5"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-text" />Sign-in uses OpenID Connect with PKCE. Access tokens live in this tab’s session storage only.</p>
          <p className="flex gap-2.5"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-text" />{user ? "You are signed in. Sessions end automatically when the token expires." : "You are viewing sample data and are not signed in."}</p>
        </CardContent>
      </Card>
    </div>
  );
}
