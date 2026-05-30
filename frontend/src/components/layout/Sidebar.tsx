import { NavLink, useNavigate } from "react-router-dom"
import { FileText, LayoutDashboard, LogOut, Upload, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/payroll", label: "Payroll", icon: Upload },
  { to: "/audit", label: "Activity", icon: FileText },
]

type SidebarProps = {
  mobileOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const navigate = useNavigate()

  const handleNav = () => {
    onClose?.()
  }

  const signOut = () => {
    localStorage.removeItem("token")
    onClose?.()
    navigate("/login")
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(100vw-3rem,17rem)] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform duration-200 ease-out lg:z-30 lg:w-56",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="shrink-0 flex items-start justify-between border-b border-[var(--color-border)] px-5 py-6 sm:px-6 sm:py-8">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Payroll
            </p>
            <h1 className="font-display mt-1 text-xl text-[var(--color-ink)] sm:text-2xl">Slip Desk</h1>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            className="rounded-md p-2 text-[var(--color-muted)] hover:bg-[var(--color-canvas)] lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={handleNav}
              className={({ isActive }) =>
                cn(
                  "mb-1 flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors last:mb-0",
                  isActive
                    ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-[var(--color-border)] p-3 sm:p-4">
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
