import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import api from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Batch = { id: number; month: number; year: number; record_count: number; status: string }
type Job = { id: number; batch_id: number; status: string; completed: number; total: number }

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function DashboardPage() {
  const [employees, setEmployees] = useState(0)
  const [batches, setBatches] = useState<Batch[]>([])
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    Promise.all([
      api.get("/employees"),
      api.get("/payroll/batches"),
      api.get("/payslips/jobs"),
    ]).then(([emp, bat, j]) => {
      setEmployees(emp.data.length)
      setBatches(bat.data.slice(0, 5))
      setJobs(j.data.slice(0, 5))
    })
  }, [])

  return (
    <div>
      <header className="mb-10">
        <h2 className="font-display text-3xl text-[var(--color-ink)]">Overview</h2>
        <p className="mt-1 text-[var(--color-muted)]">Upload payroll, generate slips, and dispatch emails</p>
      </header>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Employees on file", value: employees },
          { label: "Payroll batches", value: batches.length },
          { label: "Recent jobs", value: jobs.length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">{s.label}</p>
              <p className="font-display mt-2 text-4xl text-[var(--color-ink)]">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent payroll</CardTitle>
              <CardDescription>Monthly upload batches</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/payroll">Upload</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {batches.length === 0 ? (
                <li className="text-sm text-[var(--color-muted)]">No batches yet</li>
              ) : (
                batches.map((b) => (
                  <li key={b.id} className="flex items-center justify-between text-sm">
                    <span>
                      {MONTHS[b.month]} {b.year} · {b.record_count} records
                    </span>
                    <Badge>{b.status}</Badge>
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
                  <li key={j.id} className="flex items-center justify-between text-sm">
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
