import { describe, expect, it } from "vitest"
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@/lib/format"

// Intl output uses non-breaking spaces; normalize before asserting.
const norm = (s: string) => s.replace(/\u00a0|\u202f/g, " ")

describe("formatCurrency", () => {
  it("formats numbers as BRL", () => {
    expect(norm(formatCurrency(1234.5))).toBe("R$ 1.234,50")
  })

  it("parses numeric strings", () => {
    expect(norm(formatCurrency("99.9"))).toBe("R$ 99,90")
  })

  it("falls back to zero for non-numeric input", () => {
    expect(norm(formatCurrency("abc"))).toBe("R$ 0,00")
    expect(norm(formatCurrency(Number.POSITIVE_INFINITY))).toBe("R$ 0,00")
  })
})

describe("formatNumber", () => {
  it("groups thousands with pt-BR separators", () => {
    expect(formatNumber(1234567)).toBe("1.234.567")
    expect(formatNumber("2500")).toBe("2.500")
  })

  it("falls back to zero for non-numeric input", () => {
    expect(formatNumber("n/a")).toBe("0")
  })
})

describe("formatDate", () => {
  it("returns a dash for null", () => {
    expect(formatDate(null)).toBe("—")
  })

  it("formats Date instances as dd/mm/yyyy", () => {
    expect(formatDate(new Date(2024, 0, 5))).toBe("05/01/2024")
  })

  it("accepts ISO strings", () => {
    expect(formatDate("2024-03-15T12:00:00Z")).toMatch(/^\d{2}\/\d{2}\/2024$/)
  })
})

describe("formatDateTime", () => {
  it("returns a dash for null", () => {
    expect(formatDateTime(null)).toBe("—")
  })

  it("includes hours and minutes", () => {
    expect(norm(formatDateTime(new Date(2024, 0, 5, 14, 30)))).toBe(
      "05/01/2024, 14:30",
    )
  })
})
