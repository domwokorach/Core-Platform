import { TransferFlow } from "@/components/banking/transfer-flow";
import { TransferHistory } from "@/components/banking/transfer-history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TransfersPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-5 [&>*]:min-w-0">
      <Card className="lg:col-span-2 lg:self-start">
        <CardHeader><div><CardTitle>New transfer</CardTitle><CardDescription>Between your own FINIX accounts</CardDescription></div></CardHeader>
        <CardContent><TransferFlow /></CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader><div><CardTitle>Transfer history</CardTitle><CardDescription>Committed transfers, newest first</CardDescription></div></CardHeader>
        <CardContent><TransferHistory /></CardContent>
      </Card>
    </div>
  );
}
