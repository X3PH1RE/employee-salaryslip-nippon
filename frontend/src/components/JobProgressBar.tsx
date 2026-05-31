import { useEffect, useState } from "react"

type JobProgressBarProps = {
  label: string
  completed: number
  failed?: number
  total: number
  active: boolean
  startedAt: number | null
  /** Fallback estimate per item before the first completion (seconds). */
  secondsPerItem?: number
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function JobProgressBar({
  label,
  completed,
  failed = 0,
  total,
  active,
  startedAt,
  secondsPerItem = 5,
}: JobProgressBarProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active || !startedAt) return
    setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [active, startedAt])

  const done = completed + failed
  const effectiveTotal = total > 0 ? total : 1
  const pct = Math.min(100, Math.round((done / effectiveTotal) * 100))
  const rate = done > 0 && elapsed > 0 ? done / elapsed : 0
  const remaining =
    active && done < effectiveTotal
      ? rate > 0
        ? Math.ceil((effectiveTotal - done) / rate)
        : Math.max(1, Math.ceil((effectiveTotal - done) * secondsPerItem))
      : null

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-[var(--color-muted)]">
        <span className="font-medium text-[var(--color-ink)]">{label}</span>
        <span>
          {total > 0 ? `${done}/${total} · ${pct}%` : "Starting…"}
          {active && startedAt && ` · ${formatDuration(elapsed)} elapsed`}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500 ease-out"
          style={{ width: `${active ? Math.max(pct, 8) : pct}%` }}
        />
      </div>
      {active && remaining !== null && (
        <p className="text-xs text-[var(--color-muted)]">
          Estimated time remaining: <span className="font-medium text-[var(--color-ink)]">~{formatDuration(remaining)}</span>
        </p>
      )}
    </div>
  )
}
