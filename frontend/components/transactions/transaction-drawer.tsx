"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KindBadge, StatusBadge } from "@/components/banking/status-badge";
import { useIsMobile } from "@/hooks/use-media";
import { dateLong } from "@/lib/utils/format";
import type { Row } from "@/hooks/use-activity";
import { TxAmount } from "./tx-amount";
import { TxIcon } from "./tx-icon";

/** Right-hand drawer on tablet/desktop, bottom sheet on mobile. */
export function TransactionDrawer({ tx, onClose }: { tx: Row | null; onClose: () => void }) {
  const mobile = useIsMobile();
  return (
    <Dialog open={Boolean(tx)} onOpenChange={o => !o && onClose()}>
      <DialogContent side={mobile ? "bottom" : "right"} className="overflow-y-auto p-6 sm:p-8">
        {tx && (
          <>
            <div className="flex flex-col items-center pt-2 text-center">
              <TxIcon merchant={tx.merchant} name={tx.description} kind={tx.kind} size="lg" className="rounded-2xl" />
              <DialogTitle className="mt-4 text-base">{tx.merchant?.name ?? tx.description}</DialogTitle>
              <DialogDescription className="sr-only">Transaction details</DialogDescription>
              <TxAmount minor={tx.amountMinor} currency={tx.currency} kind={tx.kind} className="mt-1 text-3xl tracking-tight" />
              <div className="mt-3 flex gap-2"><StatusBadge status="posted" /><KindBadge kind={tx.kind} /></div>
            </div>
            <dl className="mt-8 divide-y rounded-xl border text-sm">
              {([...(tx.merchant ? [["Category", tx.merchant.category] as const] : []), ["Account", tx.accountName], ["Date", dateLong(tx.occurredAt)], ["Currency", tx.currency]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
              <div className="flex items-center justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">Reference</dt><dd className="break-all text-right font-mono text-[13px] font-medium">{tx.reference}</dd></div>
              <div className="flex items-center justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">Entry ID</dt><dd className="truncate font-mono text-xs text-muted-foreground">{tx.id}</dd></div>
            </dl>
            <Button variant="outline" className="mt-5 w-full" onClick={() => { void navigator.clipboard?.writeText(tx.reference); toast.success("Reference copied"); }}><Copy />Copy reference</Button>
            {tx.kind === "transfer" && <p className="mt-4 text-center text-xs text-muted-foreground">Own-account transfer: appears as a debit and a credit that net to zero.</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
