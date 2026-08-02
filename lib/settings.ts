import "server-only"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import { encrypt, decrypt, isEncrypted } from "./crypto"

/**
 * Lista de chaves que devem ser criptografadas antes de serem salvas no banco.
 */
const SENSITIVE_KEYS = [
  "telegram.botToken",
  "veopag.secretKey",
  "pix.config" // O PIX config pode conter dados sensíveis dependendo da implementação
]

/**
 * Internal, server-only settings helpers.
 */

export async function getSettings(storeId: string, keys: string[]) {
  if (keys.length === 0) return {}
  const rows = await db
    .select()
    .from(settings)
    .where(and(eq(settings.ownerId, storeId), inArray(settings.key, keys)))
  
  const map: Record<string, string> = {}
  for (const r of rows) {
    let value = r.value ?? ""
    
    // Se a chave for sensível e o valor parecer criptografado, descriptografamos
    if (SENSITIVE_KEYS.includes(r.key) && isEncrypted(value)) {
      value = decrypt(value) ?? value
    }
    
    map[r.key] = value
  }
  return map
}

export async function getSetting(
  storeId: string,
  key: string,
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.ownerId, storeId), eq(settings.key, key)))
    .limit(1)
  
  if (!row) return null
  
  let value = row.value ?? ""
  if (SENSITIVE_KEYS.includes(key) && isEncrypted(value)) {
    value = decrypt(value) ?? value
  }
  
  return value
}

export async function saveSetting(storeId: string, key: string, value: string) {
  let valueToSave = value
  
  // Criptografamos se a chave for sensível
  if (SENSITIVE_KEYS.includes(key) && value) {
    valueToSave = encrypt(value)
  }

  await db
    .insert(settings)
    .values({ ownerId: storeId, key, value: valueToSave })
    .onConflictDoUpdate({
      target: [settings.ownerId, settings.key],
      set: { value: valueToSave, updatedAt: new Date() },
    })
}
