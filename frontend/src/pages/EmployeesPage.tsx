import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import api, { type EmployeePreviewRow, type PreviewResult } from "@/lib/api"
import { DataTable } from "@/components/DataTable"
import { FileUploadZone } from "@/components/FileUploadZone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function EmployeesPage() {
  const [list, setList] = useState<EmployeePreviewRow[]>([])
  const [preview, setPreview] = useState<PreviewResult<EmployeePreviewRow> | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const load = useCallback(() => {
    api.get("/employees").then((r) => setList(r.data))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const columns = useMemo<ColumnDef<EmployeePreviewRow>[]>(
    () => [
      { accessorKey: "employee_id", header: "ID" },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "designation", header: "Role" },
      { accessorKey: "department", header: "Dept" },
    ],
    []
  )

  const onUpload = async (file: File) => {
    setLoading(true)
    setMessage("")
    const form = new FormData()
    form.append("file", file)
    try {
      const { data } = await api.post<PreviewResult<EmployeePreviewRow>>(
        "/employees/upload/preview",
        form
      )
      setPreview(data)
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  const commit = async () => {
    if (!preview?.valid) return
    setLoading(true)
    try {
      const { data } = await api.post("/employees/upload/commit", { rows: preview.preview })
      setMessage(`Saved: ${data.created} created, ${data.updated} updated`)
      setPreview(null)
      load()
    } catch {
      setMessage("Commit failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <header className="mb-10">
        <h2 className="font-display text-3xl text-[var(--color-ink)]">Employees</h2>
        <p className="mt-1 text-[var(--color-muted)]">Master data — ID, name, email, designation</p>
      </header>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload roster</CardTitle>
          <CardDescription>CSV or Excel with employee_id, name, email, designation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUploadZone onFile={onUpload} disabled={loading} />
          {message && <p className="text-sm text-[var(--color-accent)]">{message}</p>}
        </CardContent>
      </Card>

      {preview && (
        <Card className="mb-8">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {preview.count} rows ·{" "}
                {preview.valid ? (
                  <Badge variant="success">Valid</Badge>
                ) : (
                  <Badge variant="danger">Has errors</Badge>
                )}
              </CardDescription>
            </div>
            <Button onClick={commit} disabled={!preview.valid || loading}>
              Import employees
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.errors.length > 0 && (
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

      <Card>
        <CardHeader>
          <CardTitle>On file</CardTitle>
          <CardDescription>{list.length} employees</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={list} />
        </CardContent>
      </Card>
    </div>
  )
}
