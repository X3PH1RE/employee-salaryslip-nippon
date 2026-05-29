type PageHeaderProps = {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-6 sm:mb-10">
      <h2 className="font-display text-2xl tracking-tight text-[var(--color-ink)] sm:text-3xl">{title}</h2>
      {description && (
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)] sm:text-base">{description}</p>
      )}
    </header>
  )
}
