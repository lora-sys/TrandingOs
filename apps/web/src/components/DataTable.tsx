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
    <table aria-label="Trading Pi data table" className="dataTable heroTable">
      <thead>
        <tr>
          {table.getHeaderGroups()[0]?.headers.map((header) => (
            <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
          )) ?? []}
        </tr>
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
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return Number.isInteger(value) ? value : value.toFixed(4);
  return String(value);
}
