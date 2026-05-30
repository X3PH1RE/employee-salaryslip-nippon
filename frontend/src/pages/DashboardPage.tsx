import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, cardHeaderRow } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  fetchEmployees,
  fetchPayrollBatches,
  fetchPayslipJobs,
  queryKeys,
} from "@/lib/queries"
import { cn } from "@/lib/utils"

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function DashboardPage() {
  const employees = useQuery({ queryKey: queryKeys.employees, queryFn: fetchEmployees })
  const batches = useQuery({ queryKey: queryKeys.payrollBatches, queryFn: fetchPayrollBatches })
  const jobs = useQuery({ queryKey: queryKeys.payslipJobs, queryFn: fetchPayslipJobs })

  const employeeList = employees.data ?? []
  const batchList = batches.data ?? []
  const jobList = jobs.data ?? []
  const recentBatches = batchList.slice(0, 5)
  const recentJobs = jobList.slice(0, 5)

  const hasCachedData = employees.data || batches.data || jobs.data
  const isInitialLoad =
    !hasCachedData &&
    (employees.isPending || batches.isPending || jobs.isPending)

  if (isInitialLoad) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--color-muted)]">
        Loading overview…
      </div>
    )
  }

  const allFailed =
    employees.isError && batches.isError && jobs.isError && !hasCachedData

  if (allFailed) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-[var(--color-danger)]">Could not load overview.</p>
        <button
          type="button"
          className="text-sm text-[var(--color-accent)] underline"
          onClick={() => {
            void employees.refetch()
            void batches.refetch()
            void jobs.refetch()
          }}
        >
          Try again
        </button>
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
          { label: "Employees on file", value: employeeList.length },
          { label: "Payroll batches", value: batchList.length },
          { label: "Recent jobs", value: recentJobs.length },
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
            <Link
              to="/payroll"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full shrink-0 sm:w-auto")}
            >
              Upload
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentBatches.length === 0 ? (
                <li className="text-sm text-[var(--color-muted)]">No batches yet</li>
              ) : (
                recentBatches.map((b) => (
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
              {recentJobs.length === 0 ? (
                <li className="text-sm text-[var(--color-muted)]">No jobs yet</li>
              ) : (
                recentJobs.map((j) => (
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
