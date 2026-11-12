"use client";

import { Radio } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/paceui/motion/alert";
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
        <CardContent>
          <Alert role="status">
            <Radio aria-hidden />
            <AlertTitle>{!user ? "Live updates are off" : live === "live" ? "Connected" : "Not connected"}</AlertTitle>
            <AlertDescription>{!user ? "Sign in to enable live updates." : live === "live" ? "New transfers appear instantly." : "Data re-syncs automatically when the connection returns."}</AlertDescription>
          </Alert>
        </CardContent>
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
