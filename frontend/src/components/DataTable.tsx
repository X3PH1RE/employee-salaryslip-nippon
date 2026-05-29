import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { cn } from "@/lib/utils"

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  minWidth?: number
}

export function DataTable<T>({ columns, data, minWidth = 560 }: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="relative -mx-1 sm:mx-0">
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] overscroll-x-contain">
        <table
          className="w-full text-left text-sm"
          style={{ minWidth: `${minWidth}px` }}
        >
          <thead className="bg-[var(--color-canvas)] text-xs uppercase tracking-wider text-[var(--color-muted)]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-3 py-3 font-medium sm:px-4"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-[var(--color-muted)]"
                >
                  No rows to display
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--color-canvas)]/50">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3 py-3 text-[var(--color-ink)] sm:px-4",
                        cell.column.id === "email" && "max-w-[140px] truncate sm:max-w-none"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-center text-xs text-[var(--color-muted)] sm:hidden">
        Swipe horizontally to see more columns
      </p>
    </div>
  )
}
