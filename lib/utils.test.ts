import { describe, expect, it } from "vitest"
import { cn } from "@/lib/utils"

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("drops falsy values and supports conditional objects", () => {
    expect(cn("a", false && "b", null, undefined, { c: true, d: false })).toBe(
      "a c",
    )
  })

  it("lets later tailwind classes win over conflicting earlier ones", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
    expect(cn("text-sm text-red-500", "text-blue-500")).toBe(
      "text-sm text-blue-500",
    )
  })
})
