import "server-only"
import { db } from "@/lib/db"
import type { TenantDb } from "@/lib/db/tenant-tx"
import { settings } from "@/lib/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import { encrypt, decrypt, isEncrypted } from "./crypto"

export const REDACTED_SETTING_VALUE = "[REDACTED]"

/**
 * A classificação é explícita: somente estas chaves podem conter segredo.
 * Chaves novas devem ser adicionadas aqui antes de serem usadas para evitar
 * que um valor sensível seja persistido ou retornado como texto puro.
 */
const SENSITIVE_SETTING_KEYS = new Set([
  "telegram.botToken",
  "telegram.webhookSecret",
  "veopag.webhookSecret",
])
const SENSITIVE_SETTING_PATTERNS = [/^(veopag|gateway2|gateway3|gateway4|gateway5)\.secretKey$/]

export function isSensitiveSettingKey(key: string): boolean {
  return SENSITIVE_SETTING_KEYS.has(key) || SENSITIVE_SETTING_PATTERNS.some((pattern) => pattern.test(key))
}

type SettingsReadOptions = {
  revealSensitive?: boolean
}

function decryptSensitiveValue(key: string, value: string): string {
  if (!isEncrypted(value)) {
    throw new Error(`A configuração sensível ${key} não está criptografada.`)
  }
  const decrypted = decrypt(value)
  if (decrypted === null) {
    throw new Error(`Não foi possível validar a configuração sensível ${key}.`)
  }
  return decrypted
}

export async function getSettings(
  storeId: string,
  keys: string[],
  dctx: TenantDb = db,
  options: SettingsReadOptions = {},
) {
  if (keys.length === 0) return {}
  const rows = await dctx
    .select()
    .from(settings)
    .where(and(eq(settings.ownerId, storeId), inArray(settings.key, keys)))

  const map: Record<string, string> = {}
  for (const row of rows) {
    const rawValue = row.value ?? ""
    if (isSensitiveSettingKey(row.key)) {
      const value = decryptSensitiveValue(row.key, rawValue)
      map[row.key] = options.revealSensitive ? value : REDACTED_SETTING_VALUE
    } else {
      map[row.key] = rawValue
    }
  }
  return map
}

export async function getSetting(
  storeId: string,
  key: string,
  options: SettingsReadOptions = {},
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.ownerId, storeId), eq(settings.key, key)))
    .limit(1)

  if (!row) return null

  const rawValue = row.value ?? ""
  if (!isSensitiveSettingKey(key)) return rawValue

  const value = decryptSensitiveValue(key, rawValue)
  return options.revealSensitive ? value : REDACTED_SETTING_VALUE
}

/** Detects Postgres "relation does not exist" errors (code 42P01). */
function isRelationNotFound(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes("does not exist") || msg.includes("relation ") || msg.includes("42P01") || msg.includes("undefined table")
}

async function runBootstrap(): Promise<void> {
  const { ensureDbStructure } = await import("@/lib/db/migrate")
  await ensureDbStructure()
}

export async function saveSetting(storeId: string, key: string, value: string) {
  const valueToSave = isSensitiveSettingKey(key) ? encrypt(value) : value

  try {
    await db
      .insert(settings)
      .values({ ownerId: storeId, key, value: valueToSave })
      .onConflictDoUpdate({
        target: [settings.ownerId, settings.key],
        set: { value: valueToSave, updatedAt: new Date() },
      })
  } catch (err) {
    if (isRelationNotFound(err)) {
      console.warn("[settings] Tabela de configurações ausente; executando bootstrap controlado")
      await runBootstrap()
      await db
        .insert(settings)
        .values({ ownerId: storeId, key, value: valueToSave })
        .onConflictDoUpdate({
          target: [settings.ownerId, settings.key],
          set: { value: valueToSave, updatedAt: new Date() },
        })
    } else {
      throw err
    }
  }
}
