"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfDay, format, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarDays, ReceiptText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/paceui/motion/calendar";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/paceui/motion/empty";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/paceui/motion/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/paceui/motion/select";
import { TransactionDrawer } from "@/components/transactions/transaction-drawer";
import { TransactionList } from "@/components/transactions/transaction-list";
import { useActivity, type Row } from "@/hooks/use-activity";
import type { Account } from "@/types/banking";

const PAGE_SIZE = 8;
const ALL = "all";

/** Real ledger activity for the signed-in customer, filterable by account and date, paginated. No data is generated here. */
export function AccountActivity({ accounts, accountId, onAccountChange }: { accounts: Account[]; accountId: string; onAccountChange: (id: string) => void }) {
  const { all, isLoading } = useActivity();
  const [scope, setScope] = useState<string>(accountId || ALL);
  const [range, setRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Row | null>(null);

  // Following the account chosen in the picker above keeps the two in step.
  useEffect(() => { setScope(accountId || ALL); }, [accountId]);

  const rows = useMemo(() => all.filter(r => {
    if (scope !== ALL && r.accountId !== scope) return false;
    if (range?.from) {
      const t = new Date(r.occurredAt).getTime();
      if (t < startOfDay(range.from).getTime() || t > endOfDay(range.to ?? range.from).getTime()) return false;
    }
    return true;
  }), [all, scope, range]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [scope, range]);
  // "No transactions yet" only when the customer has none at all; otherwise the current account/date selection simply matches nothing.
  const filtered = all.length > 0;
  const items = [{ value: ALL, label: "All accounts" }, ...accounts.map(a => ({ value: a.id, label: `${a.displayName} ${a.maskedNumber}` }))];
  const rangeLabel = range?.from ? `${format(range.from, "d MMM")}${range.to && +range.to !== +range.from ? ` – ${format(range.to, "d MMM yyyy")}` : format(range.from, " yyyy")}` : "Any date";
  const go = (n: number) => (e: React.MouseEvent) => { e.preventDefault(); setPage(Math.min(pages, Math.max(1, n))); };

  return (
    <Card id="account-activity">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><CardTitle>Account activity</CardTitle><CardDescription>Posted ledger entries for your accounts</CardDescription></div>
        <div className="flex flex-wrap items-center gap-2">
          <Select items={items} value={scope} onValueChange={v => { const id = String(v); setScope(id); if (id !== ALL) onAccountChange(id); }}>
            <SelectTrigger aria-label="Account" className="min-w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{items.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
          </Select>
          {/* GBP is the only supported currency (enforced by the API and database), so this shows it rather than offering a choice. */}
          <Select items={[{ value: "GBP", label: "GBP (£)" }]} value="GBP" disabled>
            <SelectTrigger aria-label="Currency" className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="GBP">GBP (£)</SelectItem></SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" aria-label={`Filter by date, ${rangeLabel}`}><CalendarDays />{rangeLabel}</Button></PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-2">
              <Calendar mode="range" selected={range} onSelect={setRange} disabled={{ after: new Date() }} defaultMonth={range?.from} />
            </PopoverContent>
          </Popover>
          {range?.from && <Button variant="ghost" size="icon" aria-label="Clear date filter" onClick={() => setRange(undefined)}><X /></Button>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading transactions">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><ReceiptText aria-hidden /></EmptyMedia>
              <EmptyTitle>{filtered ? "No transactions match" : "No transactions yet"}</EmptyTitle>
              <EmptyDescription>{filtered ? "Try another account or date range." : "Activity will appear here once your account has posted entries."}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <TransactionList rows={visible} onSelect={setSelected} />
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground" role="status">{rows.length} {rows.length === 1 ? "entry" : "entries"} · Page {current} of {pages}</p>
              {pages > 1 && (
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem><PaginationPrevious href="#account-activity" onClick={go(current - 1)} aria-disabled={current === 1} /></PaginationItem>
                    {Array.from({ length: pages }, (_, i) => i + 1).map(n => <PaginationItem key={n}><PaginationLink href="#account-activity" isActive={n === current} aria-label={`Page ${n}`} onClick={go(n)}>{n}</PaginationLink></PaginationItem>)}
                    <PaginationItem><PaginationNext href="#account-activity" onClick={go(current + 1)} aria-disabled={current === pages} /></PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </>
        )}
      </CardContent>
      <TransactionDrawer tx={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}
