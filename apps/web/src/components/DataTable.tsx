import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import type { Row } from "../api/types.js";

export function DataTable({ data, columns }: { data: Row[]; columns?: ColumnDef<Row>[] }) {
  const derivedColumns =
    columns ??
    Object.keys(data[0] ?? {}).slice(0, 8).map((key) => ({
      accessorKey: key,
      header: key.replace(/_/g, " "),
      cell: (info) => formatCell(info.getValue()),
    } satisfies ColumnDef<Row>));
  const table = useReactTable({ data, columns: derivedColumns, getCoreRowModel: getCoreRowModel() });
  return (
    <div className="tableWrap">
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!data.length && <p className="empty tableEmpty">No rows yet.</p>}
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? value : value.toFixed(4);
  return String(value);
}
