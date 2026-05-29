import { useRef, useState } from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  accept?: string
  onFile: (file: File) => void
  disabled?: boolean
}

export function FileUploadZone({ accept = ".csv,.xlsx,.xls", onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const handle = (file: File | undefined) => {
    if (file) onFile(file)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        if (!disabled) handle(e.dataTransfer.files[0])
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-8 py-12 transition-colors",
        drag ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-muted)]",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <Upload className="mb-3 h-8 w-8 text-[var(--color-muted)]" strokeWidth={1.25} />
      <p className="text-sm font-medium text-[var(--color-ink)]">Drop file here or click to browse</p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">CSV or Excel (.xlsx)</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </div>
  )
}
