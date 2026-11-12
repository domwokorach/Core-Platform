import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-foreground" />
      <path d="M9 23V9h13v3.6H13.2v2.2h7.1v3.4h-7.1V23H9Z" className="fill-background" />
      <circle cx="23.5" cy="23" r="2.6" fill="#737373" />
    </svg>
  );
}
export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && <span className="text-[19px] font-semibold tracking-[-0.03em]">FINIX</span>}
    </span>
  );
}
