import "server-only"
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

/**
 * Utilitário de criptografia AES-256-GCM para dados sensíveis em repouso.
 * Implementa Defesa em Profundidade com IV exclusivo e tag de autenticação.
 */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const FORMAT_VERSION = "v1"

/**
 * Obtém a chave de criptografia da variável de ambiente.
 * Lança erro se a chave não estiver configurada ou for inválida em produção.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: ENCRYPTION_KEY environment variable is missing in production.")
    }
    // Fallback apenas para desenvolvimento local
    return scryptSync("dev-fallback-secret-do-not-use-in-prod", "salt", KEY_LENGTH)
  }

  // Se a chave for fornecida diretamente em hex ou base64, poderíamos processar aqui.
  // Por simplicidade e segurança, derivamos uma chave de 256 bits do segredo fornecido.
  return scryptSync(secret, "saas-telegram-salt", KEY_LENGTH)
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
 * Suporta versões futuras e lida com erros de integridade.
 */
export function decrypt(encryptedData: string): string | null {
  if (!encryptedData) return null
  
  // Se não parecer criptografado, retorna o original (migração progressiva)
  if (!isEncrypted(encryptedData)) {
    return encryptedData
  }
  
  try {
    const parts = encryptedData.split(":")
    
    // Suporte para o formato antigo (iv:authTag:encryptedText) sem versão
    let version, ivHex, authTagHex, encryptedText
    
    if (parts.length === 4) {
      [version, ivHex, authTagHex, encryptedText] = parts
    } else if (parts.length === 3) {
      [ivHex, authTagHex, encryptedText] = parts
      version = "v0" // Legado
    } else {
      return encryptedData // Caso caia aqui por erro de detecção
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
    // Erros de descriptografia (como tag inválida) são registrados, mas não expostos ao usuário
    console.error("[crypto] Decryption failed (integrity check might have failed):", 
      err instanceof Error ? err.message : "Unknown error")
    return null
  }
}

/**
 * Verifica se uma string parece estar criptografada.
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false
  const parts = text.split(":")
  return parts.length === 3 || parts.length === 4
}
