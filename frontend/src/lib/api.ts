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
