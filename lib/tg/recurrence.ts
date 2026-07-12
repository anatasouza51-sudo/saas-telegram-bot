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
    case "monthly":
      d.setMonth(d.getMonth() + 1)
      return d
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
