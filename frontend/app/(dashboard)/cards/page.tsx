"use client";

import { RevealGroup, RevealItem } from "@/components/animations/reveal";
import { AccountCard } from "@/components/banking/account-card";
import { PreviewNotice } from "@/components/banking/preview-notice";
import { useAccounts, useDashboard } from "@/hooks/use-banking";

export default function CardsPage() {
  const { data: accounts = [] } = useAccounts();
  const { data: dash } = useDashboard();
  return (
    <RevealGroup>
      <PreviewNotice>Card issuance, freezing and limits aren’t part of this core banking starter. Each card below is the digital face of one of your real accounts.</PreviewNotice>
      <RevealItem className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a, i) => <AccountCard key={a.id} account={a} holder={dash?.customerName ?? ""} variant={i % 2 ? "teal" : "navy"} type={a.displayName} />)}
      </RevealItem>
    </RevealGroup>
  );
}
