export function formatCurrency(value: number | string) {
  const n = typeof value === "string" ? Number.parseFloat(value) : value
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(n) ? n : 0)
}

export function formatNumber(value: number | string) {
  const n = typeof value === "string" ? Number.parseFloat(value) : value
  return new Intl.NumberFormat("pt-BR").format(Number.isFinite(n) ? n : 0)
}

export function formatDate(date: Date | string | null) {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

export function formatDateTime(date: Date | string | null) {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}
