"use client";

import { Radio } from "lucide-react";
import { RecentPayments } from "@/components/banking/recent-payments";
import { TransferHistory } from "@/components/banking/transfer-history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import { useLiveState } from "@/providers/live-provider";

export default function NotificationsPage() {
  const { user } = useAuth();
  const live = useLiveState();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardHeader><div><CardTitle>Connection</CardTitle><CardDescription>Real-time updates over an authenticated stream</CardDescription></div></CardHeader>
        <CardContent><p className="flex items-center gap-2 text-sm"><Radio className="size-4 text-muted-foreground" />{!user ? "Sign in to enable live updates." : live === "live" ? "Connected. New transfers appear instantly." : "Not connected right now. Data re-syncs automatically when the connection returns."}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><div><CardTitle>Recent payments</CardTitle><CardDescription>Merchant payments from your accounts</CardDescription></div></CardHeader>
        <CardContent><RecentPayments limit={5} /></CardContent>
      </Card>
      <Card>
        <CardHeader><div><CardTitle>Committed transfers</CardTitle><CardDescription>Account activity confirmed by the ledger</CardDescription></div></CardHeader>
        <CardContent><TransferHistory /></CardContent>
      </Card>
    </div>
  );
}
