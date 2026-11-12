import { ArrowLeftRight, BarChart3, Bell, CreditCard, LayoutDashboard, Send, Settings, Target, TrendingUp, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; title: string; primary?: boolean; preview?: boolean }

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, title: "Overview", primary: true },
  { href: "/accounts", label: "My Accounts", icon: Wallet, title: "My accounts", primary: true },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, title: "Transactions", primary: true },
  { href: "/transfers", label: "Transfers", icon: Send, title: "Transfers", primary: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, title: "Analytics" },
  { href: "/cards", label: "Cards", icon: CreditCard, title: "Cards", preview: true },
  { href: "/goals", label: "Savings Goals", icon: Target, title: "Savings goals", preview: true },
  { href: "/investments", label: "Investments", icon: TrendingUp, title: "Investments" },
  { href: "/notifications", label: "Notifications", icon: Bell, title: "Notifications" },
  { href: "/settings", label: "Settings", icon: Settings, title: "Settings" },
];

export const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
