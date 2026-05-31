import { useMemo, useRef, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
import { JobLoader } from "@/components/JobLoader"
import { SampleCsvDownload } from "@/components/SampleCsvDownload"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, cardHeaderRow } from "@/components/ui/card"
import {
  fetchPayrollBatches,
  invalidateAfterPayrollChange,
  invalidateAfterPayslipJob,
  queryKeys,
} from "@/lib/queries"

type Job = {
  id: number
  batch_id: number
  status: string
  completed: number
  failed: number
  total: number
}

type EmailStats = {
  sent: number
  failed: number
  pending: number
  total: number
  failures?: { email: string; error: string }[]
}

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const JOB_DONE = ["completed", "completed_with_errors"]

export function PayrollPage() {
  const queryClient = useQueryClient()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { data: batches = [], isPending: batchesLoading } = useQuery({
    queryKey: queryKeys.payrollBatches,
    queryFn: fetchPayrollBatches,
  })
  const [preview, setPreview] = useState<PreviewResult<PayrollPreviewRow> | null>(null)
  const [filename, setFilename] = useState("")
  const [uploadLoading, setUploadLoading] = useState(false)
  const [pageMessage, setPageMessage] = useState("")
  const [job, setJob] = useState<Job | null>(null)
  const [pdfResultMessage, setPdfResultMessage] = useState("")
  const [emailDispatchError, setEmailDispatchError] = useState("")
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null)
  const [documents, setDocuments] = useState<PayslipDocumentRow[]>([])
  const [generatingBatchId, setGeneratingBatchId] = useState<number | null>(null)
  const [zipLoading, setZipLoading] = useState(false)
  const [dispatchLoading, setDispatchLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [emailRunning, setEmailRunning] = useState(false)

  const jobRunning = job !== null && !JOB_DONE.includes(job.status)
  const showPdfProgress = jobRunning || generatingBatchId !== null
  const anyJobBusy = generatingBatchId !== null || jobRunning || emailRunning || zipLoading || dispatchLoading
  const emailsComplete =
    emailStats !== null &&
    !emailRunning &&
    emailStats.total > 0 &&
    emailStats.pending === 0
  const showEmailStatus = emailStats !== null && (emailRunning || emailStats.total > 0)
  const generatedDocCount = documents.filter(
    (d) => d.status === "generated" || d.downloadable
  ).length

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const pollJob = (jobId: number, mode: "pdf" | "email") => {
    stopPolling()
    const tick = async () => {
      try {
        const { data } = await api.get(`/payslips/jobs/${jobId}`)
        setJob(data.job)
        setEmailStats(data.email_stats)
        setDocuments(data.documents ?? [])

        if (mode === "pdf" && JOB_DONE.includes(data.job.status)) {
          stopPolling()
          setGeneratingBatchId(null)
          setPdfResultMessage(`PDFs ready: ${data.job.completed} generated, ${data.job.failed} failed`)
          invalidateAfterPayslipJob(queryClient)
        }

        if (mode === "email" && data.email_stats) {
          const stats = data.email_stats as EmailStats
          const done = stats.sent + stats.failed
          if (stats.total > 0 && stats.pending === 0 && done >= stats.total) {
            stopPolling()
            setEmailRunning(false)
            invalidateAfterPayslipJob(queryClient)
          }
        }
      } catch {
        stopPolling()
        setGeneratingBatchId(null)
        setEmailRunning(false)
        setPdfResultMessage("Could not check job status")
      }
    }
    void tick()
    pollRef.current = setInterval(() => void tick(), 1000)
  }

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
    setUploadLoading(true)
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
      setPageMessage("Could not parse file")
    } finally {
      setUploadLoading(false)
    }
  }

  const commit = async () => {
    if (!preview?.valid) return
    setUploadLoading(true)
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
      setPageMessage(`Batch #${data.batch.id} saved`)
      setPreview(null)
      invalidateAfterPayrollChange(queryClient)
    } catch {
      setPageMessage("Commit failed")
    } finally {
      setUploadLoading(false)
    }
  }

  const generate = async (batchId: number) => {
    setGeneratingBatchId(batchId)
    setPdfResultMessage("")
    setEmailDispatchError("")
    setEmailStats(null)
    setDocuments([])
    setEmailRunning(false)
    try {
      const { data } = await api.post("/payslips/generate", { batch_id: batchId })
      setJob(data.job)
      pollJob(data.job.id, "pdf")
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setPdfResultMessage(msg || "Failed to queue PDF generation")
      setGeneratingBatchId(null)
    }
  }

  const downloadOne = async (doc: PayslipDocumentRow) => {
    if (!doc.downloadable || !doc.filename) return
    setDownloadingId(doc.id)
    try {
      await downloadPayslipPdf(doc.id, doc.filename)
    } catch {
      setPdfResultMessage("Download failed")
    } finally {
      setDownloadingId(null)
    }
  }

  const downloadAll = async () => {
    if (!job) return
    setZipLoading(true)
    try {
      await downloadPayslipZip(job.id)
    } catch {
      setPdfResultMessage("Could not download ZIP")
    } finally {
      setZipLoading(false)
    }
  }

  const dispatchEmails = async () => {
    if (!job) return
    setDispatchLoading(true)
    setEmailRunning(true)
    setEmailDispatchError("")
    const expectedTotal = generatedDocCount || job.completed || job.total || 0
    setEmailStats({
      sent: 0,
      failed: 0,
      pending: expectedTotal,
      total: expectedTotal,
      failures: [],
    })
    pollJob(job.id, "email")
    try {
      const { data } = await api.post("/payslips/dispatch", { job_id: job.id })
      if (data.email_stats) {
        const stats = data.email_stats as EmailStats
        setEmailStats(stats)
        const done = stats.sent + stats.failed
        if (stats.total > 0 && stats.pending === 0 && done >= stats.total) {
          stopPolling()
          setEmailRunning(false)
          invalidateAfterPayslipJob(queryClient)
        }
      }
    } catch {
      stopPolling()
      setEmailRunning(false)
      setEmailDispatchError("Dispatch failed — check SMTP config")
    } finally {
      setDispatchLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Upload monthly salary data mapped by employee ID"
      />

      <Card className="mb-8">
        <CardHeader className={cardHeaderRow}>
          <div className="min-w-0">
            <CardTitle>Monthly upload</CardTitle>
            <CardDescription>
              employee_id, base_salary, hra, allowances, deductions, month, year
            </CardDescription>
          </div>
          <SampleCsvDownload href="/samples/payroll.csv" filename="payroll_sample.csv" />
        </CardHeader>
        <CardContent>
          <FileUploadZone onFile={onUpload} disabled={uploadLoading || anyJobBusy} />
        </CardContent>
      </Card>

      {preview && (
        <Card className="mb-8">
          <CardHeader className={cardHeaderRow}>
            <div className="min-w-0">
              <CardTitle>Preview before automation</CardTitle>
              <CardDescription>
                {preview.count} records · Net = Base + HRA + Allowances − Deductions
              </CardDescription>
            </div>
            <Button
              className="w-full shrink-0 sm:w-auto"
              onClick={commit}
              disabled={!preview.valid || uploadLoading}
              loading={uploadLoading}
            >
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
            <DataTable columns={columns} data={preview.preview} minWidth={720} />
          </CardContent>
        </Card>
      )}

      {pageMessage && (
        <p className="mb-6 text-sm text-[var(--color-accent)]">{pageMessage}</p>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Batches &amp; automation</CardTitle>
          <CardDescription>Generate PDFs and send emails asynchronously</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {batchesLoading ? (
            <p className="text-sm text-[var(--color-muted)]">Loading batches…</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {batches.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {MONTHS[b.month]} {b.year}
                    </p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {b.record_count} employees · Batch #{b.id}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => generate(b.id)}
                    disabled={anyJobBusy}
                    loading={generatingBatchId === b.id || (jobRunning && job?.batch_id === b.id)}
                  >
                    Generate PDFs
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {job && (
            <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
              <p className="text-sm font-medium">Job #{job.id}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Status: {job.status} · {job.completed}/{job.total} PDFs
                {job.failed > 0 && ` · ${job.failed} failed`}
              </p>

              {pdfResultMessage && (
                <p className="mt-2 text-sm font-medium text-[var(--color-accent)]">{pdfResultMessage}</p>
              )}

              {showPdfProgress && (
                <JobLoader
                  label="Generating PDFs…"
                  detail={
                    job.total > 0
                      ? `${job.completed + job.failed}/${job.total} processed`
                      : undefined
                  }
                />
              )}

              {emailRunning && (
                <JobLoader
                  label="Sending emails…"
                  detail={
                    emailStats && emailStats.total > 0
                      ? `${emailStats.sent + emailStats.failed}/${emailStats.total} sent`
                      : generatedDocCount > 0
                        ? `0/${generatedDocCount} sent`
                        : undefined
                  }
                />
              )}

              {showEmailStatus && emailStats && (
                <div className="mt-2 text-sm">
                  <p
                    className={
                      emailsComplete
                        ? "font-medium text-[var(--color-accent)]"
                        : "text-[var(--color-muted)]"
                    }
                  >
                    {emailsComplete
                      ? `Emails done: ${emailStats.sent} sent, ${emailStats.failed} failed`
                      : `Email: ${emailStats.sent} sent, ${emailStats.failed} failed, ${emailStats.pending} pending`}
                  </p>
                  {emailStats.failures && emailStats.failures.length > 0 && (
                    <ul className="mt-2 space-y-1 rounded-md bg-red-50 p-3 text-xs break-words text-red-900">
                      {emailStats.failures.map((f, i) => (
                        <li key={i}>
                          <strong>{f.email}:</strong> {f.error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {emailDispatchError && (
                <p className="mt-2 text-sm text-[var(--color-danger)]">{emailDispatchError}</p>
              )}

              {JOB_DONE.includes(job.status) && !emailRunning && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={downloadAll}
                    disabled={zipLoading || dispatchLoading}
                    loading={zipLoading}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download all (ZIP)
                  </Button>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={dispatchEmails}
                    disabled={zipLoading || dispatchLoading}
                    loading={dispatchLoading}
                  >
                    Send payslip emails
                  </Button>
                </div>
              )}

              {documents.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
                  {documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 text-[var(--color-ink)]">
                        <span>
                          {doc.employee_name ?? "Unknown"} ({doc.employee_id ?? "—"})
                          {doc.status === "failed" && (
                            <span className="ml-2 text-[var(--color-danger)]">failed</span>
                          )}
                        </span>
                        {doc.status === "failed" && doc.error_message && (
                          <p className="mt-1 text-xs break-words text-red-800">{doc.error_message}</p>
                        )}
                      </div>
                      {doc.downloadable && doc.filename && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-full sm:w-auto"
                          loading={downloadingId === doc.id}
                          onClick={() => downloadOne(doc)}
                        >
                          <Download className="h-3.5 w-3.5" />
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
