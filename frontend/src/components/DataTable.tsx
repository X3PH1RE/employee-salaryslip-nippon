import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[]
  data: T[]
}

export function DataTable<T>({ columns, data }: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--color-canvas)] text-xs uppercase tracking-wider text-[var(--color-muted)]">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 font-medium">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--color-muted)]">
                No rows to display
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--color-canvas)]/50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-[var(--color-ink)]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
