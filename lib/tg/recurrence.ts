// Pure recurrence math shared by the scheduler UI and the cron processor.

export type Recurrence =
  | { kind: "once" }
  | { kind: "daily" }
  | { kind: "weekly" }
  | { kind: "monthly" }
  | { kind: "interval"; unit: "minutes" | "hours" | "days"; every: number }

export const RECURRENCE_LABELS: Record<string, string> = {
  once: "Uma vez",
  daily: "Todo dia",
  weekly: "Toda semana",
  monthly: "Todo mês",
  interval: "A cada X",
}

/**
 * Computes the next run strictly after `from`. Returns null for one-shot
 * schedules (kind "once"), signalling the schedule should deactivate.
 * 
 * IMPORTANT: Preserves the original hour/minute of the base runAt so that
 * daily/weekly/monthly schedules always fire at the same time of day.
 */
export function nextRun(rec: Recurrence, from: Date): Date | null {
  const d = new Date(from)
  switch (rec.kind) {
    case "once":
      return null
    case "daily":
      d.setDate(d.getDate() + 1)
      return d
    case "weekly":
      d.setDate(d.getDate() + 7)
      return d
    case "monthly": {
      // Handle end-of-month edge cases: if the target month has fewer days
      // than the current date, clamp to the last day of that month.
      const targetMonth = d.getMonth() + 1
      const targetYear = targetMonth === 12 ? d.getFullYear() + 1 : d.getFullYear()
      const actualMonth = targetMonth === 12 ? 0 : targetMonth
      const lastDayOfMonth = new Date(targetYear, actualMonth, 0).getDate()
      d.setDate(Math.min(d.getDate(), lastDayOfMonth))
      d.setMonth(actualMonth)
      d.setFullYear(targetYear)
      return d
    }
    case "interval": {
      const every = Math.max(1, rec.every)
      if (rec.unit === "minutes") d.setMinutes(d.getMinutes() + every)
      else if (rec.unit === "hours") d.setHours(d.getHours() + every)
      else d.setDate(d.getDate() + every)
      return d
    }
    default:
      return null
  }
}

export function parseRecurrence(json: string | null | undefined): Recurrence {
  if (!json) return { kind: "once" }
  try {
    return JSON.parse(json) as Recurrence
  } catch {
    return { kind: "once" }
  }
}

/**
 * Validates a recurrence object. Returns true if the config is valid.
 */
export function isValidRecurrence(rec: Recurrence): boolean {
  if (!rec || !rec.kind) return false
  if (rec.kind === "once") return true
  if (rec.kind === "daily" || rec.kind === "weekly" || rec.kind === "monthly") return true
  if (rec.kind === "interval") {
    return ["minutes", "hours", "days"].includes(rec.unit) && Number.isInteger(rec.every) && rec.every >= 1
  }
  return false
}

/**
 * Returns a human-readable label for a recurrence.
 */
export function recurrenceLabel(rec: Recurrence): string {
  if (rec.kind === "once") return "Uma vez"
  if (rec.kind === "daily") return "Todo dia"
  if (rec.kind === "weekly") return "Toda semana"
  if (rec.kind === "monthly") return "Todo mês"
  if (rec.kind === "interval") {
    return `A cada ${rec.every} ${rec.unit === "minutes" ? "minutos" : rec.unit === "hours" ? "horas" : "dias"}`
  }
  return "Desconhecido"
}
