import { describe, expect, it, vi } from "vitest"
import { botIdFromToken, TG_KEYS } from "@/lib/tg/config"

vi.mock("@/lib/db", () => ({ db: {} }))

describe("botIdFromToken", () => {
  it("extracts the numeric bot id from a valid token", () => {
    expect(botIdFromToken("8123456789:AAExampleHash")).toBe(8123456789)
  })

  it("returns null for malformed tokens", () => {
    expect(botIdFromToken("")).toBeNull()
    expect(botIdFromToken("no-colon")).toBeNull()
    expect(botIdFromToken("abc:hash")).toBeNull()
    expect(botIdFromToken("0:hash")).toBeNull()
    expect(botIdFromToken("-5:hash")).toBeNull()
    expect(botIdFromToken("1.5:hash")).toBeNull()
  })
})

describe("TG_KEYS", () => {
  it("namespaces every setting key under telegram", () => {
    for (const key of Object.values(TG_KEYS)) {
      expect(key.startsWith("telegram.")).toBe(true)
    }
    expect(new Set(Object.values(TG_KEYS)).size).toBe(Object.keys(TG_KEYS).length)
  })
})
