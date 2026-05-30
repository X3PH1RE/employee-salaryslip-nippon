import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import api from "@/lib/api"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, cardHeaderRow } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Batch = { id: number; month: number; year: number; record_count: number; status: string }
type Job = { id: number; batch_id: number; status: string; completed: number; total: number }

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function DashboardPage() {
  const [employees, setEmployees] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)
  const [batches, setBatches] = useState<Batch[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then(({ data }) => {
        setEmployees(data.employee_count)
        setBatchTotal(data.batch_total)
        setBatches(data.batches)
        setJobs(data.jobs)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--color-muted)]">
        Loading overview…
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Upload payroll, generate slips, and dispatch emails"
      />

      <div className="mb-8 grid gap-3 sm:mb-10 sm:grid-cols-3 sm:gap-4">
        {[
          { label: "Employees on file", value: employees },
          { label: "Payroll batches", value: batchTotal },
          { label: "Recent jobs", value: jobs.length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 sm:pt-6">
              <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">{s.label}</p>
              <p className="font-display mt-2 text-3xl text-[var(--color-ink)] sm:text-4xl">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className={cardHeaderRow}>
            <div className="min-w-0">
              <CardTitle>Recent payroll</CardTitle>
              <CardDescription>Monthly upload batches</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" asChild>
              <Link to="/payroll">Upload</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {batches.length === 0 ? (
                <li className="text-sm text-[var(--color-muted)]">No batches yet</li>
              ) : (
                batches.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      {MONTHS[b.month]} {b.year} · {b.record_count} records
                    </span>
                    <Badge className="w-fit">{b.status}</Badge>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generation jobs</CardTitle>
            <CardDescription>PDF &amp; email pipeline status</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {jobs.length === 0 ? (
                <li className="text-sm text-[var(--color-muted)]">No jobs yet</li>
              ) : (
                jobs.map((j) => (
                  <li
                    key={j.id}
                    className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>Job #{j.id} · Batch {j.batch_id}</span>
                    <span className="text-[var(--color-muted)]">
                      {j.completed}/{j.total} · {j.status}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
