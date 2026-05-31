/** Parse API datetime strings (naive UTC ISO or offset/Z) as a UTC instant. */
export function parseApiUtc(iso: string): Date {
  if (!iso) return new Date(NaN)
  if (iso.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(iso)) {
    return new Date(iso)
  }
  return new Date(`${iso}Z`)
}

/** Format an API UTC timestamp for display in IST (Asia/Kolkata). */
export function formatDateTimeIst(iso: string): string {
  const date = parseApiUtc(iso)
  if (Number.isNaN(date.getTime())) return iso

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}
