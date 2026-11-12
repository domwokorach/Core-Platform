import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ message, onRetry, retrying }: { message?: string; onRetry?: () => void; retrying?: boolean }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border-2 border-foreground/70 bg-muted px-6 py-10 text-center">
      <TriangleAlert className="mb-3 size-8 text-destructive-text" />
      <h3 className="font-semibold text-destructive-text">We couldn’t load this</h3>
      <p className="mt-1 max-w-md text-sm text-destructive-text/90">{message || "Something went wrong reaching the banking service. Your money is safe — this is only a display problem."}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry} loading={retrying}><RefreshCw />Try again</Button>}
    </div>
  );
}
