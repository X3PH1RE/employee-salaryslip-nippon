import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("admin@company.com")
  const [password, setPassword] = useState("admin123")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await api.post("/auth/setup")
      const { data } = await api.post("/auth/login", { email, password })
      localStorage.setItem("token", data.access_token)
      navigate("/")
    } catch {
      setError("Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-muted)]">
            Internal use
          </p>
          <h1 className="font-display mt-2 text-3xl text-[var(--color-ink)] sm:text-4xl">Slip Desk</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Salary slip generation &amp; dispatch
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Admin sign in</CardTitle>
            <CardDescription>Use your payroll administrator credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
