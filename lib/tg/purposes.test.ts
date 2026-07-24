import { describe, expect, it } from "vitest"
import {
  EXCLUSIVE_PURPOSES,
  getPurposeMeta,
  isExclusivePurpose,
  isValidPurpose,
  PURPOSES,
  PURPOSE_VALUES,
} from "@/lib/tg/purposes"

describe("purpose catalog", () => {
  it("exposes unique values with labels and descriptions", () => {
    expect(new Set(PURPOSE_VALUES).size).toBe(PURPOSES.length)
    for (const p of PURPOSES) {
      expect(p.label).toBeTruthy()
      expect(p.description).toBeTruthy()
    }
  })

  it("keeps 'audience' as the first (default) purpose", () => {
    expect(PURPOSES[0].value).toBe("audience")
  })

  it("lists exactly the exclusive single-chat roles", () => {
    expect(EXCLUSIVE_PURPOSES).toEqual(["cdn", "management", "backups"])
  })
})

describe("getPurposeMeta", () => {
  it("returns the metadata of a known purpose", () => {
    expect(getPurposeMeta("cdn")).toEqual(
      PURPOSES.find((p) => p.value === "cdn"),
    )
  })

  it("falls back to the default purpose for unknown values", () => {
    expect(getPurposeMeta("nope")).toBe(PURPOSES[0])
    expect(getPurposeMeta("")).toBe(PURPOSES[0])
  })
})

describe("isValidPurpose", () => {
  it("accepts every catalogued value", () => {
    for (const value of PURPOSE_VALUES) {
      expect(isValidPurpose(value)).toBe(true)
    }
  })

  it("rejects anything else", () => {
    expect(isValidPurpose("audiences")).toBe(false)
    expect(isValidPurpose("")).toBe(false)
  })
})

describe("isExclusivePurpose", () => {
  it("is true only for exclusive roles", () => {
    expect(isExclusivePurpose("cdn")).toBe(true)
    expect(isExclusivePurpose("management")).toBe(true)
    expect(isExclusivePurpose("backups")).toBe(true)
    expect(isExclusivePurpose("audience")).toBe(false)
    expect(isExclusivePurpose("logs")).toBe(false)
    expect(isExclusivePurpose("unknown")).toBe(false)
  })
})
