"use client";

import { useMemo, useState } from "react";
import { createColumnDef } from "./columns";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rowEnter, stagger } from "@/lib/animations/variants";
import type { Row } from "@/hooks/use-activity";

export function TransactionsTable({ rows, onSelect, pageSize = 10 }: { rows: Row[]; onSelect: (r: Row) => void; pageSize?: number }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "occurredAt", desc: true }]);
  const columns = useMemo(() => createColumnDef(), []);
  const table = useReactTable({
    data: rows, columns, state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } }, autoResetPageIndex: true,
  });
  const { pageIndex } = table.getState().pagination;
  const pages = table.getPageCount();
  return (
    <div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(hg => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map(h => {
                const sorted = h.column.getIsSorted();
                const right = h.column.id === "amountMinor";
                return (
                  <TableHead key={h.id} aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined} className={right ? "text-right" : undefined}>
                    {h.column.getCanSort() ? (
                      <button onClick={h.column.getToggleSortingHandler()} className={`inline-flex items-center gap-1.5 rounded-md uppercase tracking-wide hover:text-foreground ${right ? "flex-row-reverse" : ""}`}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {sorted === "asc" ? <ArrowUp className="size-3.5" /> : sorted === "desc" ? <ArrowDown className="size-3.5" /> : <ArrowUpDown className="size-3.5 opacity-50" />}
                      </button>
                    ) : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <motion.tbody key={`${pageIndex}-${sorting[0]?.id}-${sorting[0]?.desc}`} variants={stagger(0.025)} initial="hidden" animate="show">
          {table.getRowModel().rows.map(row => (
            <motion.tr key={row.id} variants={rowEnter} className="cursor-pointer border-b transition-colors duration-150 last:border-0 hover:bg-muted/50 focus-within:bg-muted/50" onClick={() => onSelect(row.original)}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} className={cell.column.id === "amountMinor" ? "text-right" : undefined}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </motion.tr>
          ))}
        </motion.tbody>
      </Table>
      <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
        <span aria-live="polite">{rows.length} {rows.length === 1 ? "entry" : "entries"} · Page {pages ? pageIndex + 1 : 0} of {pages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page"><ChevronLeft />Prev</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">Next<ChevronRight /></Button>
        </div>
      </div>
    </div>
  );
}
