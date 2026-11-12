"use client";

import { useMemo, useState } from "react";
import { Receipt, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/banking/empty-state";
import { ErrorState } from "@/components/banking/error-state";
import { useActivity, type Row } from "@/hooks/use-activity";
import { LEDGER_PAGE, type TxKind } from "@/lib/utils/analytics";
import { useFilters } from "@/providers/filters-provider";
import { TransactionDrawer } from "./transaction-drawer";
import { TransactionList } from "./transaction-list";
import { TransactionsTable } from "./transactions-table";

const KINDS: { value: "all" | TxKind; label: string }[] = [
  { value: "all", label: "All types" }, { value: "credit", label: "Credits" }, { value: "debit", label: "Debits" }, { value: "transfer", label: "Transfers" },
];

function FilterFields({ kind, setKind, account, setAccount, accounts }: { kind: string; setKind: (v: "all" | TxKind) => void; account: string; setAccount: (v: string) => void; accounts: { id: string; displayName: string; maskedNumber: string }[] }) {
  return (
    <>
      <Select value={kind} onValueChange={v => setKind(v as "all" | TxKind)}>
        <SelectTrigger aria-label="Transaction type" className="sm:w-40"><SelectValue /></SelectTrigger>
        <SelectContent>{KINDS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={account} onValueChange={setAccount}>
        <SelectTrigger aria-label="Account" className="sm:w-52"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All accounts</SelectItem>
          {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.displayName} {a.maskedNumber}</SelectItem>)}
        </SelectContent>
      </Select>
    </>
  );
}

export function TransactionsView() {
  const { rows, accounts, isLoading, error, refetch, isFetching, all } = useActivity();
  const { search, setSearch } = useFilters();
  const [kind, setKind] = useState<"all" | TxKind>("all");
  const [account, setAccount] = useState("all");
  const [selected, setSelected] = useState<Row | null>(null);
  const [sheet, setSheet] = useState(false);
  const filtered = useMemo(() => rows.filter(r => (kind === "all" || r.kind === kind) && (account === "all" || r.accountId === account)), [rows, kind, account]);
  const active = (kind !== "all" ? 1 : 0) + (account !== "all" ? 1 : 0);
  const clear = () => { setKind("all"); setAccount("all"); setSearch(""); };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Filter transactions" placeholder="Search merchant or reference" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="hidden gap-2 sm:flex"><FilterFields {...{ kind, setKind, account, setAccount, accounts }} /></div>
        <Button variant="outline" className="sm:hidden" onClick={() => setSheet(true)}><SlidersHorizontal />Filters{active ? ` (${active})` : ""}</Button>
      </div>

      {error ? <div className="p-5"><ErrorState message={error.message} onRetry={() => void refetch()} retrying={isFetching} /></div>
        : isLoading ? <div className="space-y-4 p-5">{Array.from({ length: 6 }, (_, i) => <div key={i} className="flex items-center gap-3"><Skeleton className="size-10 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3 w-1/4" /></div><Skeleton className="h-4 w-20" /></div>)}</div>
        : filtered.length === 0 ? (
          <EmptyState icon={Receipt} title={all.length ? "No matching transactions" : "No transactions yet"} description={all.length ? "Try a different search, widen the date range, or clear your filters." : "Once money moves in or out of your accounts, it will show up here."}
            action={all.length ? <Button variant="outline" onClick={clear}><X />Clear filters</Button> : undefined} />
        ) : (
          <>
            <div className="hidden md:block"><TransactionsTable rows={filtered} onSelect={setSelected} /></div>
            <div className="p-3 md:hidden"><TransactionList rows={filtered} onSelect={setSelected} /></div>
            {all.length >= LEDGER_PAGE && <p className="border-t px-5 py-3 text-xs text-muted-foreground">Showing your latest {LEDGER_PAGE} ledger entries.</p>}
          </>
        )}

      <TransactionDrawer tx={selected} onClose={() => setSelected(null)} />
      <Dialog open={sheet} onOpenChange={setSheet}>
        <DialogContent side="bottom" className="p-6">
          <DialogTitle>Filters</DialogTitle><DialogDescription className="sr-only">Filter transactions by type and account</DialogDescription>
          <div className="mt-5 space-y-3"><FilterFields {...{ kind, setKind, account, setAccount, accounts }} /></div>
          <div className="mt-6 grid grid-cols-2 gap-2"><Button variant="outline" onClick={clear}>Reset</Button><Button onClick={() => setSheet(false)}>Show {filtered.length} results</Button></div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
