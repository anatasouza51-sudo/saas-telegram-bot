import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repo = process.cwd()

function source(file: string) {
  return readFileSync(join(repo, file), "utf8")
}

test.describe("Separação Admin/tenant da Mistic Pay", () => {
  test("gate Admin exige capability e administrador principal", () => {
    const guard = source("lib/platform-admin.ts")

    expect(guard).toContain('requireCapability("settings.manage")')
    expect(guard).toContain("PLATFORM_ADMIN_EMAIL")
    expect(guard).toContain("isPlatformAdmin")
    expect(guard).toContain("user.email.trim().toLowerCase()")
    expect(guard).toContain('user.ownerId === null')
  })

  test("settings globais protegem Client Secret e splitUser", () => {
    const settings = source("lib/platform-settings.ts")
    const actions = source("app/actions/platform-settings.ts")

    expect(settings).toContain('PLATFORM_SETTING_KEYS.misticPayClientSecret')
    expect(settings).toContain('PLATFORM_SETTING_KEYS.misticPaySplitUser')
    expect(settings).toContain("encrypt(value)")
    expect(settings).toContain('return "[REDACTED]"')
    expect(actions).toContain("requirePlatformAdmin()")
    expect(actions).toContain("Nenhum segredo ou valor de comissão foi registrado no log.")
  })

  test("tenant mantém Client ID, Client Secret e webhook, mas não recebe comissão", () => {
    const page = source("app/(panel)/gateway/page.tsx")
    const form = source("components/settings/gateway-form.tsx")
    const action = source("app/actions/settings.ts")

    expect(page).toContain('id: "misticpay"')
    expect(page).toContain("${provider.id}.publicKey")
    expect(page).toContain("${provider.id}.secretKey")
    expect(form).toContain("Client ID")
    expect(form).toContain("Client Secret")
    expect(form).toContain("Endpoint de webhook")
    expect(form).not.toContain("splitUser")
    expect(form).not.toContain("comissão")
    expect(action).not.toContain("splitUser")
  })

  test("bot lê splitUser exclusivamente do control plane global", () => {
    const bot = source("lib/bot.ts")

    expect(bot).toContain("getPlatformMisticPayConfig({ revealSensitive: true })")
    expect(bot).toContain("platformMisticPay.splitUser")
    expect(bot).not.toContain('map["misticpay.splitUser"]')
  })

  test("migration global não usa ownerId e preserva a política inicial", () => {
    const migration = source("lib/db/migrations/0004_platform_settings.sql")

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS platform_settings")
    expect(migration).toContain("key TEXT NOT NULL UNIQUE")
    expect(migration).toContain("'misticpay.commissionCents', '75'")
    expect(migration).toContain("'misticpay.commissionPercent', '25'")
    expect(migration).not.toContain("ownerId")
  })
})
