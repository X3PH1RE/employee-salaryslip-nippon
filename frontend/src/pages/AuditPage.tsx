import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Log = {
  id: number
  action: string
  entity_type: string | null
  entity_id: string | null
  details: string | null
  admin_email: string | null
  created_at: string
}

export function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([])

  useEffect(() => {
    api.get("/audit").then((r) => setLogs(r.data))
  }, [])

  return (
    <div>
      <header className="mb-10">
        <h2 className="font-display text-3xl text-[var(--color-ink)]">Activity</h2>
        <p className="mt-1 text-[var(--color-muted)]">Audit trail for uploads, PDFs, and emails</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <CardDescription>{logs.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {logs.map((log) => (
              <li
                key={log.id}
                className="border-b border-[var(--color-border)] pb-4 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--color-ink)]">
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <time className="text-xs text-[var(--color-muted)]">
                    {new Date(log.created_at).toLocaleString()}
                  </time>
                </div>
                {log.details && (
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{log.details}</p>
                )}
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  {log.admin_email}
                  {log.entity_type && ` · ${log.entity_type} ${log.entity_id ?? ""}`}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
