import { afterEach, describe, expect, it } from "vitest"
import { maskSecret, telegramConfig, veopagConfig } from "@/lib/integrations"

const VARS = [
  "TELEGRAM_BOT_TOKEN",
  "VEOPAG_PUBLIC_KEY",
  "VEOPAG_SECRET_KEY",
] as const

describe("integration config", () => {
  const original = Object.fromEntries(VARS.map((v) => [v, process.env[v]]))

  afterEach(() => {
    for (const v of VARS) {
      if (original[v] === undefined) delete process.env[v]
      else process.env[v] = original[v]
    }
  })

  it("reads the telegram token lazily from the environment", () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    expect(telegramConfig.botToken).toBe("")
    expect(telegramConfig.isConfigured).toBe(false)
    process.env.TELEGRAM_BOT_TOKEN = "123:abc"
    expect(telegramConfig.botToken).toBe("123:abc")
    expect(telegramConfig.isConfigured).toBe(true)
  })

  it("requires both veopag keys to be configured", () => {
    delete process.env.VEOPAG_PUBLIC_KEY
    delete process.env.VEOPAG_SECRET_KEY
    expect(veopagConfig.publicKey).toBe("")
    expect(veopagConfig.secretKey).toBe("")
    expect(veopagConfig.isConfigured).toBe(false)

    process.env.VEOPAG_PUBLIC_KEY = "pub"
    expect(veopagConfig.isConfigured).toBe(false)

    process.env.VEOPAG_SECRET_KEY = "sec"
    expect(veopagConfig.isConfigured).toBe(true)
    expect(veopagConfig.publicKey).toBe("pub")
    expect(veopagConfig.secretKey).toBe("sec")
  })
})

describe("maskSecret", () => {
  it("returns null when there is no value", () => {
    expect(maskSecret(undefined)).toBeNull()
    expect(maskSecret("")).toBeNull()
  })

  it("fully hides short secrets", () => {
    expect(maskSecret("12345678")).toBe("••••••••")
  })

  it("shows only the first and last four characters of long secrets", () => {
    expect(maskSecret("abcdefghijkl")).toBe("abcd••••ijkl")
  })
})
