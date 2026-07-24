import { describe, expect, it } from "vitest"
import {
  isValidRecurrence,
  nextRun,
  parseRecurrence,
  recurrenceLabel,
  type Recurrence,
} from "@/lib/tg/recurrence"

const at = (y: number, m: number, d: number, h = 9, min = 30) =>
  new Date(y, m - 1, d, h, min)

describe("nextRun", () => {
  it("returns null for one-shot schedules", () => {
    expect(nextRun({ kind: "once" }, at(2024, 1, 1))).toBeNull()
  })

  it("advances daily and weekly keeping the time of day", () => {
    expect(nextRun({ kind: "daily" }, at(2024, 1, 31))).toEqual(at(2024, 2, 1))
    expect(nextRun({ kind: "weekly" }, at(2024, 1, 1))).toEqual(at(2024, 1, 8))
  })

  it("advances monthly, clamping to the last day of shorter months", () => {
    expect(nextRun({ kind: "monthly" }, at(2024, 1, 15))).toEqual(at(2024, 2, 15))
    expect(nextRun({ kind: "monthly" }, at(2024, 1, 31))).toEqual(at(2024, 2, 29))
    expect(nextRun({ kind: "monthly" }, at(2023, 1, 31))).toEqual(at(2023, 2, 28))
  })

  it("rolls over to the next year in December", () => {
    expect(nextRun({ kind: "monthly" }, at(2024, 12, 10))).toEqual(at(2025, 1, 10))
  })

  it("adds intervals in the configured unit", () => {
    expect(
      nextRun({ kind: "interval", unit: "minutes", every: 45 }, at(2024, 1, 1)),
    ).toEqual(at(2024, 1, 1, 10, 15))
    expect(
      nextRun({ kind: "interval", unit: "hours", every: 2 }, at(2024, 1, 1)),
    ).toEqual(at(2024, 1, 1, 11, 30))
    expect(
      nextRun({ kind: "interval", unit: "days", every: 3 }, at(2024, 1, 1)),
    ).toEqual(at(2024, 1, 4))
  })

  it("treats a non-positive interval as 1", () => {
    expect(
      nextRun({ kind: "interval", unit: "days", every: 0 }, at(2024, 1, 1)),
    ).toEqual(at(2024, 1, 2))
  })

  it("does not mutate the base date", () => {
    const from = at(2024, 1, 1)
    nextRun({ kind: "daily" }, from)
    expect(from).toEqual(at(2024, 1, 1))
  })

  it("returns null for an unknown kind", () => {
    expect(nextRun({ kind: "yearly" } as unknown as Recurrence, at(2024, 1, 1))).toBeNull()
  })
})

describe("parseRecurrence", () => {
  it("defaults to once for nullish or malformed JSON", () => {
    expect(parseRecurrence(null)).toEqual({ kind: "once" })
    expect(parseRecurrence(undefined)).toEqual({ kind: "once" })
    expect(parseRecurrence("nope")).toEqual({ kind: "once" })
  })

  it("parses a stored recurrence", () => {
    const rec: Recurrence = { kind: "interval", unit: "hours", every: 6 }
    expect(parseRecurrence(JSON.stringify(rec))).toEqual(rec)
  })
})

describe("isValidRecurrence", () => {
  it("accepts the fixed kinds", () => {
    for (const kind of ["once", "daily", "weekly", "monthly"] as const) {
      expect(isValidRecurrence({ kind })).toBe(true)
    }
  })

  it("validates interval unit and step", () => {
    expect(isValidRecurrence({ kind: "interval", unit: "minutes", every: 5 })).toBe(true)
    expect(isValidRecurrence({ kind: "interval", unit: "minutes", every: 0 })).toBe(false)
    expect(isValidRecurrence({ kind: "interval", unit: "minutes", every: 1.5 })).toBe(false)
    expect(
      isValidRecurrence({
        kind: "interval",
        unit: "weeks",
        every: 1,
      } as unknown as Recurrence),
    ).toBe(false)
  })

  it("rejects missing or unknown kinds", () => {
    expect(isValidRecurrence(null as unknown as Recurrence)).toBe(false)
    expect(isValidRecurrence({} as unknown as Recurrence)).toBe(false)
    expect(isValidRecurrence({ kind: "yearly" } as unknown as Recurrence)).toBe(false)
  })
})

describe("recurrenceLabel", () => {
  it("labels the fixed kinds", () => {
    expect(recurrenceLabel({ kind: "once" })).toBe("Uma vez")
    expect(recurrenceLabel({ kind: "daily" })).toBe("Todo dia")
    expect(recurrenceLabel({ kind: "weekly" })).toBe("Toda semana")
    expect(recurrenceLabel({ kind: "monthly" })).toBe("Todo mês")
  })

  it("labels intervals with the unit in Portuguese", () => {
    expect(recurrenceLabel({ kind: "interval", unit: "minutes", every: 15 })).toBe(
      "A cada 15 minutos",
    )
    expect(recurrenceLabel({ kind: "interval", unit: "hours", every: 2 })).toBe(
      "A cada 2 horas",
    )
    expect(recurrenceLabel({ kind: "interval", unit: "days", every: 3 })).toBe(
      "A cada 3 dias",
    )
  })

  it("falls back to unknown", () => {
    expect(recurrenceLabel({ kind: "yearly" } as unknown as Recurrence)).toBe(
      "Desconhecido",
    )
  })
})
