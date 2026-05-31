import type { QueryClient } from "@tanstack/react-query"
import axios from "axios"
import api from "@/lib/api"

const TOKEN_KEY = "token"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
}

/** Returns false if token is missing, malformed, or past JWT exp. */
export function isTokenValid(): boolean {
  const token = getToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number }
    if (typeof payload.exp !== "number") return true
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function setupApiAuth(queryClient: QueryClient) {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        const url = error.config?.url ?? ""
        if (!url.includes("/auth/login")) {
          clearAuth()
          queryClient.clear()
          if (!window.location.pathname.startsWith("/login")) {
            window.location.assign("/login")
          }
        }
      }
      return Promise.reject(error)
    }
  )
}
