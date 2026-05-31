import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTimeIst } from "@/lib/datetime"
import { fetchAuditLogs, queryKeys } from "@/lib/queries"

export function AuditPage() {
  const { data: logs = [], isPending, isFetching } = useQuery({
    queryKey: queryKeys.audit,
    queryFn: fetchAuditLogs,
  })

  const isRefreshing = isFetching && !isPending

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Audit trail for uploads, PDFs, and emails"
      />

      {isRefreshing && (
        <p
          className="mb-4 flex items-center gap-2 text-sm text-[var(--color-muted)]"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--color-accent)]" aria-hidden />
          Updating activity…
        </p>
      )}

      {isPending && (
        <p className="mb-4 text-sm text-[var(--color-muted)]" role="status" aria-live="polite">
          Loading activity…
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <CardDescription>{logs.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <p className="text-sm text-[var(--color-muted)]">Fetching recent events…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No activity yet.</p>
          ) : (
            <ul className="space-y-4">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="border-b border-[var(--color-border)] pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <time
                      className="shrink-0 text-xs text-[var(--color-muted)]"
                      dateTime={log.created_at}
                      title="IST (UTC+5:30)"
                    >
                      {formatDateTimeIst(log.created_at)} IST
                    </time>
                  </div>
                  {log.details && (
                    <p className="mt-1 text-sm break-words text-[var(--color-muted)]">{log.details}</p>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    {log.admin_email}
                    {log.entity_type && ` · ${log.entity_type} ${log.entity_id ?? ""}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
