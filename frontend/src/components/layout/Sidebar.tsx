import { NavLink, useNavigate } from "react-router-dom"
import { FileText, LayoutDashboard, LogOut, Upload, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/payroll", label: "Payroll", icon: Upload },
  { to: "/audit", label: "Activity", icon: FileText },
]

export function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-6 py-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
          Payroll
        </p>
        <h1 className="font-display mt-1 text-2xl text-[var(--color-ink)]">Slip Desk</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
              )
            }
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-[var(--color-border)] p-4">
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("token")
            navigate("/login")
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
