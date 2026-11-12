import type { ColumnDef } from "@tanstack/react-table";
import { KindBadge, StatusBadge } from "@/components/banking/status-badge";
import { dateLong } from "@/lib/utils/format";
import type { Row } from "@/hooks/use-activity";
import { TransactionAmount } from "./transaction-amount";
import { TxIcon } from "./tx-icon";

export const createColumnDef = (): ColumnDef<Row>[] => [
  {
    accessorKey: "description", header: "Transaction",
    cell: ({ row: { original: r } }) => (
      <button className="group flex items-center gap-3 text-left outline-none focus-visible:underline" aria-label={`${r.merchant?.name ?? r.description}. View details`}>
        <TxIcon merchant={r.merchant} name={r.description} kind={r.kind} />
        <span className="min-w-0"><span className="block truncate font-medium">{r.merchant?.name ?? r.description}</span><span className="block truncate text-xs text-muted-foreground">{r.accountName}</span></span>
      </button>
    ),
  },
  { id: "category", header: "Category", accessorFn: r => r.merchant?.category ?? "", cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{getValue<string>() || "\u2014"}</span> },
  { accessorKey: "kind", header: "Type", cell: ({ row }) => <KindBadge kind={row.original.kind} /> },
  { id: "status", header: "Status", enableSorting: false, cell: () => <StatusBadge status="posted" /> },
  { accessorKey: "occurredAt", header: "Date", cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{dateLong(getValue<string>())}</span> },
  { accessorKey: "reference", header: "Reference", enableSorting: false, cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{getValue<string>()}</span> },
  { accessorKey: "amountMinor", header: "Amount", cell: ({ row: { original: r } }) => <TransactionAmount amountMinor={r.amountMinor} currency={r.currency} /> },
];
