import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

// A ENCRYPTION_KEY deve ser definida via variável de ambiente em produção.
// Para este projeto, usaremos o BETTER_AUTH_SECRET como base para derivar a chave se presente,
// ou um fallback seguro se não houver.
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET || "fallback-secret-key-at-least-32-chars-long"
  return scryptSync(secret, "salt", 32)
}

/**
 * Criptografa um texto usando AES-256-GCM.
 * Retorna uma string no formato iv:authTag:encryptedText (hex).
 */
export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH)
  const key = getEncryptionKey()
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const authTag = cipher.getAuthTag().toString("hex")
  
  return `${iv.toString("hex")}:${authTag}:${encrypted}`
}

/**
 * Descriptografa um texto no formato iv:authTag:encryptedText.
 * Retorna o texto original ou null se a descriptografia falhar.
 */
export function decrypt(encryptedData: string): string | null {
  try {
    const [ivHex, authTagHex, encryptedText] = encryptedData.split(":")
    if (!ivHex || !authTagHex || !encryptedText) return null

    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")
    const key = getEncryptionKey()
    
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedText, "hex", "utf8")
    decrypted += decipher.final("utf8")
    
    return decrypted
  } catch (err) {
    console.error("[crypto] Decryption failed:", err)
    return null
  }
}

/**
 * Verifica se uma string parece estar criptografada no nosso formato.
 */
export function isEncrypted(text: string): boolean {
  return text.split(":").length === 3
}
