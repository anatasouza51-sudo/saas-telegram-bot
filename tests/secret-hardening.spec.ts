import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repo = process.cwd()

function source(file: string) {
  return readFileSync(join(repo, file), "utf8")
}

test.describe("Hardening de segredos e configurações", () => {
  test("novas cifras usam ENCRYPTION_KEY e não BETTER_AUTH_SECRET como fallback", () => {
    const crypto = source("lib/crypto.ts")
    expect(crypto).toContain("process.env.ENCRYPTION_KEY")
    expect(crypto).toContain("process.env.LEGACY_ENCRYPTION_KEY")
    expect(crypto).not.toContain("process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET")
  })

  test("settings sensíveis exigem cifra e são mascarados por padrão", () => {
    const settings = source("lib/settings.ts")
    expect(settings).toContain('export const REDACTED_SETTING_VALUE = "[REDACTED]"')
    expect(settings).toContain("isEncrypted(value)")
    expect(settings).toContain("revealSensitive")
    expect(settings).toContain("return options.revealSensitive ? value : REDACTED_SETTING_VALUE")
  })

  test("a página de Telegram não recebe o token descriptografado", () => {
    const page = source("app/(panel)/telegram/page.tsx")
    expect(page).toContain("getCurrentBotPreview")
    expect(page).not.toContain('getBotPreview(saved["telegram.botToken"]')
  })
})
