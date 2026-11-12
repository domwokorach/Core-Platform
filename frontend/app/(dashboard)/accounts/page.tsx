"use client";

import { AccountBalance } from "@/components/banking/account-balance";
import { Wallet } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/animations/reveal";
import { AccountCard } from "@/components/banking/account-card";
import { EmptyState } from "@/components/banking/empty-state";
import { ErrorState } from "@/components/banking/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccounts, useDashboard } from "@/hooks/use-banking";

export default function AccountsPage() {
  const { data: accounts = [], isLoading, error, refetch, isFetching } = useAccounts();
  const { data: dash } = useDashboard();
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} retrying={isFetching} />;
  if (isLoading) return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1].map(i => <Skeleton key={i} className="aspect-[1.6/1] rounded-2xl" />)}</div>;
  if (!accounts.length) return <EmptyState icon={Wallet} title="No accounts yet" description="Your accounts will appear here once they’re opened." />;
  const holder = dash?.customerName ?? "Account holder";
  return (
    <RevealGroup className="space-y-5">
      <RevealItem className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a, i) => <AccountCard key={a.id} account={a} holder={holder} variant={i % 2 ? "teal" : "navy"} type={a.displayName} />)}
      </RevealItem>
      <RevealItem>
        <Card>
          <CardHeader><div><CardTitle>Account details</CardTitle><CardDescription>Balances are summed from immutable ledger entries</CardDescription></div></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Account</TableHead><TableHead>Number</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>{accounts.map(a => <TableRow key={a.id}><TableCell className="font-medium">{a.displayName}</TableCell><TableCell className="num text-muted-foreground">{a.maskedNumber}</TableCell><TableCell>{a.currency}</TableCell><TableCell className="text-right"><AccountBalance balanceMinor={a.balanceMinor} currency={a.currency} className="font-semibold" /></TableCell></TableRow>)}</TableBody>
            </Table>
          </CardContent>
        </Card>
      </RevealItem>
    </RevealGroup>
  );
}
