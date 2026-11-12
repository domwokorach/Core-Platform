"use client";

import Link from "next/link";
import { LogIn, LogOut, Settings, ShieldCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDashboard } from "@/hooks/use-banking";
import { initials } from "@/lib/utils/format";
import { useAuth } from "@/providers/auth-provider";

export function ProfileMenu() {
  const { user, demo, signIn, signOut, loading } = useAuth();
  const { data } = useDashboard();
  const name = user ? data?.customerName ?? String(user.profile.name ?? "Customer") : demo ? demo.name : "Guest";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Open profile menu" className="grid size-10 place-items-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground outline-none transition-shadow hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        {user || demo ? initials(name) : "G"}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          <span className="font-normal">{user ? String(user.profile.email ?? "Signed in") : demo ? demo.email : "Viewing sample data"}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/settings"><Settings />Settings</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/settings#security"><ShieldCheck />Security</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        {user || demo
          ? <DropdownMenuItem onSelect={() => void signOut()}><LogOut />Sign out</DropdownMenuItem>
          : <DropdownMenuItem disabled={loading} onSelect={() => void signIn()}><LogIn />Sign in</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
