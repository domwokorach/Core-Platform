import { Info } from "lucide-react";

export function PreviewNotice({ children }: { children: React.ReactNode }) {
  return <p role="note" className="mb-5 flex items-start gap-2.5 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-info-text"><Info className="mt-0.5 size-4 shrink-0" /><span>{children}</span></p>;
}
