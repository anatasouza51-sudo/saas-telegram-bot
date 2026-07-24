import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { getAppBaseUrl } from "@/lib/urls"

const VARS = [
  "BETTER_AUTH_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
  "V0_RUNTIME_URL",
] as const

describe("getAppBaseUrl", () => {
  const original: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const v of VARS) {
      original[v] = process.env[v]
      delete process.env[v]
    }
  })

  afterEach(() => {
    for (const v of VARS) {
      if (original[v] === undefined) delete process.env[v]
      else process.env[v] = original[v]
    }
  })

  it("prefers BETTER_AUTH_URL", () => {
    process.env.BETTER_AUTH_URL = "https://panel.example.com"
    process.env.VERCEL_URL = "preview.vercel.app"
    expect(getAppBaseUrl()).toBe("https://panel.example.com")
  })

  it("falls back to the Vercel production URL", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "prod.vercel.app"
    process.env.VERCEL_URL = "preview.vercel.app"
    expect(getAppBaseUrl()).toBe("https://prod.vercel.app")
  })

  it("falls back to the Vercel deployment URL", () => {
    process.env.VERCEL_URL = "preview.vercel.app"
    expect(getAppBaseUrl()).toBe("https://preview.vercel.app")
  })

  it("falls back to the v0 runtime URL, then localhost", () => {
    process.env.V0_RUNTIME_URL = "https://runtime.v0.dev"
    expect(getAppBaseUrl()).toBe("https://runtime.v0.dev")
    delete process.env.V0_RUNTIME_URL
    expect(getAppBaseUrl()).toBe("http://localhost:3000")
  })
})
