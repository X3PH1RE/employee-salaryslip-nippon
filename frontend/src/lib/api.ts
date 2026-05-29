import axios from "axios"

const api = axios.create({
  baseURL: "/api",
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

export type PreviewResult<T> = {
  valid: boolean
  errors: { row: number | null; message: string }[]
  preview: T[]
  count: number
}

export type PayrollPreviewRow = {
  employee_id: string
  name: string
  email: string
  designation: string
  base_salary: number
  hra: number
  allowances: number
  deductions: number
  net_salary: number
  month: number
  year: number
}

export type EmployeePreviewRow = {
  employee_id: string
  name: string
  email: string
  designation: string
  birth_year?: number
  department?: string
}

export type PayslipDocumentRow = {
  id: number
  job_id: number
  status: string
  employee_id: string | null
  employee_name: string | null
  filename: string | null
  downloadable: boolean
  error_message?: string | null
}

function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

export async function downloadPayslipPdf(documentId: number, filename: string) {
  const { data } = await api.get(`/payslips/documents/${documentId}/download`, {
    responseType: "blob",
  })
  saveBlob(data, filename)
}

export async function downloadPayslipZip(jobId: number) {
  const { data } = await api.get(`/payslips/jobs/${jobId}/download`, {
    responseType: "blob",
  })
  saveBlob(data, `payslips_job_${jobId}.zip`)
}
