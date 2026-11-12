"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-media";

/** Confirmation for state-changing card actions. A centred dialog on desktop, a bottom sheet on mobile. */
export function ConfirmDialog({ open, title, description, confirmLabel, pending, onConfirm, onClose }: {
  open: boolean; title: string; description: React.ReactNode; confirmLabel: string; pending?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const mobile = useIsMobile();
  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !pending) onClose(); }}>
      <DialogContent side={mobile ? "bottom" : "center"} className="p-6">
        <DialogTitle className="pr-8">{title}</DialogTitle>
        <DialogDescription className="mt-2 leading-relaxed">{description}</DialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={pending} className="max-sm:h-12 max-sm:w-full">Cancel</Button>
          <Button onClick={onConfirm} loading={pending} className="max-sm:h-12 max-sm:w-full">{confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
