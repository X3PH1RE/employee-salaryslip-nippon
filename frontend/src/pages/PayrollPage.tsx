import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import api, {
  downloadPayslipPdf,
  downloadPayslipZip,
  type PayslipDocumentRow,
  type PayrollPreviewRow,
  type PreviewResult,
} from "@/lib/api"
import { Download } from "lucide-react"
import { DataTable } from "@/components/DataTable"
import { FileUploadZone } from "@/components/FileUploadZone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
type Batch = { id: number; month: number; year: number; record_count: number; status: string }
type Job = {
  id: number
  batch_id: number
  status: string
  completed: number
  failed: number
  total: number
}
type EmailStats = { sent: number; failed: number; pending: number; total: number }

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export function PayrollPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [preview, setPreview] = useState<PreviewResult<PayrollPreviewRow> | null>(null)
  const [filename, setFilename] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [job, setJob] = useState<Job | null>(null)
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null)
  const [documents, setDocuments] = useState<PayslipDocumentRow[]>([])
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const loadBatches = useCallback(() => {
    api.get("/payroll/batches").then((r) => setBatches(r.data))
  }, [])

  useEffect(() => {
    loadBatches()
  }, [loadBatches])

  const columns = useMemo<ColumnDef<PayrollPreviewRow>[]>(
    () => [
      { accessorKey: "employee_id", header: "ID" },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "base_salary", header: "Base", cell: ({ getValue }) => `₹${Number(getValue()).toLocaleString()}` },
      { accessorKey: "hra", header: "HRA", cell: ({ getValue }) => `₹${Number(getValue()).toLocaleString()}` },
      { accessorKey: "allowances", header: "Allow.", cell: ({ getValue }) => `₹${Number(getValue()).toLocaleString()}` },
      { accessorKey: "deductions", header: "Deduct.", cell: ({ getValue }) => `₹${Number(getValue()).toLocaleString()}` },
      { accessorKey: "net_salary", header: "Net", cell: ({ getValue }) => <span className="font-medium">₹{Number(getValue()).toLocaleString()}</span> },
    ],
    []
  )

  const onUpload = async (file: File) => {
    setLoading(true)
    setFilename(file.name)
    const form = new FormData()
    form.append("file", file)
    try {
      const { data } = await api.post<PreviewResult<PayrollPreviewRow> & { filename?: string }>(
        "/payroll/upload/preview",
        form
      )
      setPreview(data)
    } catch {
      setMessage("Could not parse file")
    } finally {
      setLoading(false)
    }
  }

  const commit = async () => {
    if (!preview?.valid) return
    setLoading(true)
    try {
      const rows = preview.preview.map((r) => ({
        employee_id: r.employee_id,
        base_salary: r.base_salary,
        hra: r.hra,
        allowances: r.allowances,
        deductions: r.deductions,
        month: r.month,
        year: r.year,
      }))
      const { data } = await api.post("/payroll/upload/commit", { rows, filename })
      setMessage(`Batch #${data.batch.id} saved`)
      setPreview(null)
      loadBatches()
    } catch {
      setMessage("Commit failed")
    } finally {
      setLoading(false)
    }
  }

  const generate = async (batchId: number) => {
    setLoading(true)
    setMessage("")
    try {
      const { data } = await api.post("/payslips/generate", { batch_id: batchId })
      setJob(data.job)
      pollJob(data.job.id)
      setMessage(`PDF job #${data.job.id} started`)
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setMessage(msg || "Failed to queue PDF generation")
      setLoading(false)
    }
  }

  const pollJob = (jobId: number) => {
    const interval = setInterval(async () => {
      const { data } = await api.get(`/payslips/jobs/${jobId}`)
      setJob(data.job)
      setEmailStats(data.email_stats)
      setDocuments(data.documents ?? [])
      if (["completed", "completed_with_errors"].includes(data.job.status)) {
        clearInterval(interval)
        setLoading(false)
        setMessage(`PDFs ready: ${data.job.completed} generated, ${data.job.failed} failed`)
      }
    }, 2000)
  }

  const downloadOne = async (doc: PayslipDocumentRow) => {
    if (!doc.downloadable || !doc.filename) return
    setDownloadingId(doc.id)
    try {
      await downloadPayslipPdf(doc.id, doc.filename)
    } catch {
      setMessage("Download failed")
    } finally {
      setDownloadingId(null)
    }
  }

  const downloadAll = async () => {
    if (!job) return
    setLoading(true)
    try {
      await downloadPayslipZip(job.id)
    } catch {
      setMessage("Could not download ZIP")
    } finally {
      setLoading(false)
    }
  }

  const dispatchEmails = async () => {
    if (!job) return
    setLoading(true)
    try {
      await api.post("/payslips/dispatch", { job_id: job.id })
      setMessage("Emails queued for delivery")
      setTimeout(() => pollJob(job.id), 3000)
    } catch {
      setMessage("Dispatch failed — check SMTP config")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <header className="mb-10">
        <h2 className="font-display text-3xl text-[var(--color-ink)]">Payroll</h2>
        <p className="mt-1 text-[var(--color-muted)]">
          Upload monthly salary data mapped by employee ID
        </p>
      </header>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Monthly upload</CardTitle>
          <CardDescription>
            employee_id, base_salary, hra, allowances, deductions, month, year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone onFile={onUpload} disabled={loading} />
        </CardContent>
      </Card>

      {preview && (
        <Card className="mb-8">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Preview before automation</CardTitle>
              <CardDescription>
                {preview.count} records · Net = Base + HRA + Allowances − Deductions
              </CardDescription>
            </div>
            <Button onClick={commit} disabled={!preview.valid || loading}>
              Confirm &amp; save batch
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!preview.valid && (
              <ul className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
                {preview.errors.map((err, i) => (
                  <li key={i}>
                    {err.row ? `Row ${err.row}: ` : ""}
                    {err.message}
                  </li>
                ))}
              </ul>
            )}
            <DataTable columns={columns} data={preview.preview} />
          </CardContent>
        </Card>
      )}

      {message && (
        <p className="mb-6 text-sm text-[var(--color-accent)]">{message}</p>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Batches &amp; automation</CardTitle>
          <CardDescription>Generate PDFs and send emails asynchronously</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y divide-[var(--color-border)]">
            {batches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                <div>
                  <p className="font-medium">
                    {MONTHS[b.month]} {b.year}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {b.record_count} employees · Batch #{b.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generate(b.id)}
                    disabled={loading}
                  >
                    Generate PDFs
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {job && (
            <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
              <p className="text-sm font-medium">Job #{job.id}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Status: {job.status} · {job.completed}/{job.total} PDFs
                {job.failed > 0 && ` · ${job.failed} failed`}
              </p>
              {emailStats && (
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Email: {emailStats.sent} sent, {emailStats.failed} failed, {emailStats.pending} pending
                </p>
              )}
              {["completed", "completed_with_errors"].includes(job.status) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={downloadAll} disabled={loading}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download all (ZIP)
                  </Button>
                  <Button size="sm" onClick={dispatchEmails} disabled={loading}>
                    Send payslip emails
                  </Button>
                </div>
              )}

              {documents.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
                  {documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-[var(--color-ink)]">
                        {doc.employee_name ?? "Unknown"} ({doc.employee_id ?? "—"})
                        {doc.status === "failed" && (
                          <span className="ml-2 text-[var(--color-danger)]">failed</span>
                        )}
                      </span>
                      {doc.downloadable && doc.filename && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          disabled={downloadingId === doc.id}
                          onClick={() => downloadOne(doc)}
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          PDF
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
