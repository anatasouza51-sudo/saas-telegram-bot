import "server-only"
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

/**
 * AES-256-GCM para dados sensíveis em repouso.
 *
 * ENCRYPTION_KEY é exclusivo para dados cifrados. BETTER_AUTH_SECRET não é
 * usado como fallback. Durante uma migração controlada, LEGACY_ENCRYPTION_KEY
 * pode ser definido temporariamente para ler dados cifrados por uma versão
 * anterior; novos valores nunca são cifrados com essa chave legada.
 */
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const FORMAT_VERSION = "v1"

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "saas-telegram-encryption-salt", KEY_LENGTH)
}

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) {
    throw new Error("[crypto] ENCRYPTION_KEY must be configured")
  }
  return deriveKey(secret)
}

function getLegacyEncryptionKey(): Buffer | null {
  const secret = process.env.LEGACY_ENCRYPTION_KEY
  return secret ? deriveKey(secret) : null
}

function decryptWithKey(encryptedData: string, key: Buffer): string {
  const parts = encryptedData.split(":")
  let ivHex: string
  let authTagHex: string
  let encryptedText: string

  if (parts.length === 4 && parts[0] === FORMAT_VERSION) {
    [, ivHex, authTagHex, encryptedText] = parts
  } else if (parts.length === 3) {
    [ivHex, authTagHex, encryptedText] = parts
  } else {
    throw new Error("invalid encrypted value format")
  }

  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("invalid encrypted value lengths")
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encryptedText, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

export function encrypt(text: string): string {
  if (!text) return ""

  try {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    const authTag = cipher.getAuthTag().toString("hex")
    return `${FORMAT_VERSION}:${iv.toString("hex")}:${authTag}:${encrypted}`
  } catch (err) {
    console.error("[crypto] Encryption failed", err instanceof Error ? err.name : "unknown")
    throw new Error("Falha na criptografia de dados sensíveis.")
  }
}

export function decrypt(encryptedData: string): string | null {
  if (!encryptedData) return null
  if (!isEncrypted(encryptedData)) return encryptedData

  try {
    return decryptWithKey(encryptedData, getEncryptionKey())
  } catch (primaryError) {
    const legacyKey = getLegacyEncryptionKey()
    if (legacyKey) {
      try {
        return decryptWithKey(encryptedData, legacyKey)
      } catch {
        // A mensagem abaixo não contém o valor cifrado nem a chave.
      }
    }
    console.error(
      "[crypto] Decryption failed",
      primaryError instanceof Error ? primaryError.name : "unknown",
    )
    return null
  }
}

export function isEncrypted(text: string): boolean {
  if (!text) return false
  const parts = text.split(":")
  return (parts.length === 4 && parts[0] === FORMAT_VERSION) || parts.length === 3
}
