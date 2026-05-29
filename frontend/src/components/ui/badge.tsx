import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
        success: "bg-emerald-50 text-emerald-800",
        warning: "bg-amber-50 text-amber-800",
        danger: "bg-red-50 text-red-800",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
