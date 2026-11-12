"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;
export const DialogTitle = ({ className, ...p }: React.ComponentProps<typeof D.Title>) => <D.Title className={cn("text-lg font-semibold tracking-tight", className)} {...p} />;
export const DialogDescription = ({ className, ...p }: React.ComponentProps<typeof D.Description>) => <D.Description className={cn("text-sm text-muted-foreground", className)} {...p} />;

const overlay = "fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-200";

const content = cva("fixed z-50 flex flex-col bg-popover text-popover-foreground shadow-lift outline-none duration-250 data-[state=open]:animate-in data-[state=closed]:animate-out", {
  variants: {
    side: {
      center: "left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      left: "inset-y-0 left-0 h-dvh w-[85vw] max-w-xs border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
      right: "inset-y-0 right-0 h-dvh w-full max-w-md border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
      bottom: "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
    },
  },
  defaultVariants: { side: "center" },
});

/** One Dialog primitive serves confirmation dialogs (center), detail drawers (right) and mobile bottom sheets (bottom). */
export function DialogContent({ className, children, side, hideClose, ...p }: React.ComponentProps<typeof D.Content> & VariantProps<typeof content> & { hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content className={cn(content({ side }), className)} {...p}>
        {side === "bottom" && <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border" />}
        {children}
        {!hideClose && (
          <D.Close className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}
export const SheetContent = DialogContent;
