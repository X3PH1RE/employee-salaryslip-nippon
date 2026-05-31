import { Download } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SampleCsvDownloadProps = {
  href: string
  filename: string
  label?: string
}

export function SampleCsvDownload({
  href,
  filename,
  label = "Download sample CSV",
}: SampleCsvDownloadProps) {
  return (
    <a
      href={href}
      download={filename}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full shrink-0 sm:w-auto")}
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  )
}
