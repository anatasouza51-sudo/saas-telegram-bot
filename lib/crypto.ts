import "server-only"
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

/**
 * Utilitário de criptografia AES-256-GCM para dados sensíveis em repouso.
 * Corrigido (C-3): Fail-closed se ENCRYPTION_KEY / BETTER_AUTH_SECRET ausentes,
 * eliminando o fallback inseguro com literal hardcoded.
 */
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const FORMAT_VERSION = "v1"

/**
 * Obtém a chave de criptografia da variável de ambiente.
 * Lança erro se a chave não estiver configurada (fail-closed).
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error("[crypto] ENCRYPTION_KEY or BETTER_AUTH_SECRET must be configured")
  }
  return scryptSync(secret, "saas-telegram-encryption-salt", KEY_LENGTH)
}

/**
 * Criptografa um texto usando AES-256-GCM.
 * Formato de saída: version:iv:authTag:encryptedText (hex)
 */
export function encrypt(text: string): string {
  if (!text) return ""
  try {
    const iv = randomBytes(IV_LENGTH)
    const key = getEncryptionKey()
    const cipher = createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    const authTag = cipher.getAuthTag().toString("hex")
    return `${FORMAT_VERSION}:${iv.toString("hex")}:${authTag}:${encrypted}`
  } catch (err) {
    console.error("[crypto] Encryption failed:", err instanceof Error ? err.message : err)
    throw new Error("Falha na criptografia de dados sensíveis.")
  }
}

/**
 * Descriptografa um texto no formato version:iv:authTag:encryptedText.
 */
export function decrypt(encryptedData: string): string | null {
  if (!encryptedData) return null
  if (!isEncrypted(encryptedData)) {
    return encryptedData
  }
  try {
    const parts = encryptedData.split(":")
    let version, ivHex, authTagHex, encryptedText
    if (parts.length === 4) {
      [version, ivHex, authTagHex, encryptedText] = parts
    } else if (parts.length === 3) {
      [ivHex, authTagHex, encryptedText] = parts
      version = "v0"
    } else {
      return encryptedData
    }
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")
    const key = getEncryptionKey()
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedText, "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  } catch (err) {
    console.error("[crypto] Decryption failed (integrity check failed):", 
      err instanceof Error ? err.message : "Unknown error")
    return null
  }
}

/**
 * Verifica se uma string parece estar criptografada no formato esperado.
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false
  const parts = text.split(":")
  return (parts.length === 4 && parts[0] === FORMAT_VERSION) || parts.length === 3
}
