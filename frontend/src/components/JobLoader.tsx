import { Loader2 } from "lucide-react"

type JobLoaderProps = {
  label: string
  detail?: string
}

export function JobLoader({ label, detail }: JobLoaderProps) {
  return (
    <div
      className="mt-3 flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-white px-3 py-2.5"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className="h-5 w-5 shrink-0 animate-spin text-[var(--color-accent)]"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-ink)]">{label}</p>
        {detail && (
          <p className="text-xs text-[var(--color-muted)]">{detail}</p>
        )}
      </div>
    </div>
  )
}
