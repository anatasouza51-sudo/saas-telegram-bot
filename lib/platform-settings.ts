import "server-only"

import { and, eq, inArray } from "drizzle-orm"
import { decrypt, encrypt, isEncrypted } from "@/lib/crypto"
import { db } from "@/lib/db"
import { platformSettings } from "@/lib/db/schema"

export const PLATFORM_SETTING_KEYS = {
  misticPayClientId: "misticpay.platform.clientId",
  misticPayClientSecret: "misticpay.platform.clientSecret",
  misticPaySplitUser: "misticpay.platform.splitUser",
  misticPayCommissionCents: "misticpay.commissionCents",
  misticPayCommissionPercent: "misticpay.commissionPercent",
  misticPayEnabled: "misticpay.enabled",
} as const

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[keyof typeof PLATFORM_SETTING_KEYS]

const SENSITIVE_KEYS = new Set<PlatformSettingKey>([
  PLATFORM_SETTING_KEYS.misticPayClientSecret,
  PLATFORM_SETTING_KEYS.misticPaySplitUser,
])

function isPlatformSettingKey(key: string): key is PlatformSettingKey {
  return Object.values(PLATFORM_SETTING_KEYS).includes(key as PlatformSettingKey)
}

function maskOrDecrypt(key: PlatformSettingKey, value: string | null, revealSensitive: boolean): string | null {
  if (!value) return null
  if (!SENSITIVE_KEYS.has(key)) return value
  if (!revealSensitive) return "[REDACTED]"
  return decrypt(value)
}

export async function getPlatformSetting(
  key: PlatformSettingKey,
  options: { revealSensitive?: boolean } = {},
): Promise<string | null> {
  const row = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1)

  return maskOrDecrypt(key, row[0]?.value ?? null, options.revealSensitive === true)
}

export async function getPlatformSettings(
  keys: PlatformSettingKey[],
  options: { revealSensitive?: boolean } = {},
): Promise<Record<PlatformSettingKey, string | null>> {
  if (keys.length === 0) return {} as Record<PlatformSettingKey, string | null>

  const rows = await db
    .select({ key: platformSettings.key, value: platformSettings.value })
    .from(platformSettings)
    .where(inArray(platformSettings.key, keys))

  const result = {} as Record<PlatformSettingKey, string | null>
  for (const key of keys) result[key] = null
  for (const row of rows) {
    if (isPlatformSettingKey(row.key)) {
      result[row.key] = maskOrDecrypt(row.key, row.value, options.revealSensitive === true)
    }
  }
  return result
}

export async function savePlatformSetting(key: PlatformSettingKey, value: string | null): Promise<void> {
  const storedValue = value == null || value === ""
    ? null
    : SENSITIVE_KEYS.has(key)
      ? encrypt(value)
      : value

  await db
    .insert(platformSettings)
    .values({ key, value: storedValue, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: storedValue, updatedAt: new Date() },
    })
}

export type PlatformMisticPayConfig = {
  clientId: string
  clientSecret: string
  splitUser: string
  commissionCents: number
  commissionPercent: string
  enabled: boolean
}

function parseCents(value: string | null): number {
  const cents = Number.parseInt(value ?? "75", 10)
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : 75
}

function parseEnabled(value: string | null): boolean {
  return value === "true"
}

export async function getPlatformMisticPayConfig(
  options: { revealSensitive?: boolean } = {},
): Promise<PlatformMisticPayConfig> {
  const keys = Object.values(PLATFORM_SETTING_KEYS)
  const saved = await getPlatformSettings(keys, options)
  return {
    clientId: saved[PLATFORM_SETTING_KEYS.misticPayClientId] ?? "",
    clientSecret: saved[PLATFORM_SETTING_KEYS.misticPayClientSecret] ?? "",
    splitUser: saved[PLATFORM_SETTING_KEYS.misticPaySplitUser] ?? "",
    commissionCents: parseCents(saved[PLATFORM_SETTING_KEYS.misticPayCommissionCents]),
    commissionPercent: saved[PLATFORM_SETTING_KEYS.misticPayCommissionPercent] ?? "25",
    enabled: parseEnabled(saved[PLATFORM_SETTING_KEYS.misticPayEnabled]),
  }
}

export async function getPlatformMisticPayCredentials(): Promise<Pick<PlatformMisticPayConfig, "clientId" | "clientSecret" | "splitUser"> | null> {
  const config = await getPlatformMisticPayConfig({ revealSensitive: true })
  if (!config.clientId || !config.clientSecret || !config.splitUser) return null
  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    splitUser: config.splitUser,
  }
}

export function isMaskedPlatformValue(value: string | null | undefined): boolean {
  return value === "[REDACTED]"
}

export function isEncryptedPlatformValue(value: string | null | undefined): boolean {
  return Boolean(value && isEncrypted(value))
}
