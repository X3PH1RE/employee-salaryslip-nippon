import type { QueryClient } from "@tanstack/react-query"
import api, { type EmployeePreviewRow } from "@/lib/api"

export type DashboardSummary = {
  employee_count: number
  batch_total: number
  batches: {
    id: number
    month: number
    year: number
    record_count: number
    status: string
  }[]
  jobs: {
    id: number
    batch_id: number
    status: string
    completed: number
    total: number
  }[]
}

export type PayrollBatch = {
  id: number
  month: number
  year: number
  record_count: number
  status: string
}

export type AuditLog = {
  id: number
  action: string
  entity_type: string | null
  entity_id: string | null
  details: string | null
  admin_email: string | null
  created_at: string
}

export const queryKeys = {
  dashboardSummary: ["dashboard", "summary"] as const,
  employees: ["employees", "list"] as const,
  payrollBatches: ["payroll", "batches"] as const,
  audit: ["audit", "list"] as const,
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>("/dashboard/summary")
  return data
}

export async function fetchEmployees(): Promise<EmployeePreviewRow[]> {
  const { data } = await api.get<EmployeePreviewRow[]>("/employees")
  return data
}

export async function fetchPayrollBatches(): Promise<PayrollBatch[]> {
  const { data } = await api.get<PayrollBatch[]>("/payroll/batches")
  return data
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const { data } = await api.get<AuditLog[]>("/audit")
  return data
}

/** Prefetch all list data once after login / app shell mount. */
export function prefetchAppData(client: QueryClient) {
  return Promise.all([
    client.prefetchQuery({ queryKey: queryKeys.dashboardSummary, queryFn: fetchDashboardSummary }),
    client.prefetchQuery({ queryKey: queryKeys.employees, queryFn: fetchEmployees }),
    client.prefetchQuery({ queryKey: queryKeys.payrollBatches, queryFn: fetchPayrollBatches }),
    client.prefetchQuery({ queryKey: queryKeys.audit, queryFn: fetchAuditLogs }),
  ])
}

export function invalidateAfterEmployeeChange(client: QueryClient) {
  void client.invalidateQueries({ queryKey: queryKeys.employees })
  void client.invalidateQueries({ queryKey: queryKeys.dashboardSummary })
  void client.invalidateQueries({ queryKey: queryKeys.audit })
}

export function invalidateAfterPayrollChange(client: QueryClient) {
  void client.invalidateQueries({ queryKey: queryKeys.payrollBatches })
  void client.invalidateQueries({ queryKey: queryKeys.dashboardSummary })
  void client.invalidateQueries({ queryKey: queryKeys.audit })
}

export function invalidateAfterPayslipJob(client: QueryClient) {
  void client.invalidateQueries({ queryKey: queryKeys.dashboardSummary })
  void client.invalidateQueries({ queryKey: queryKeys.audit })
}
