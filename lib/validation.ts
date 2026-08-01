import "server-only"

/**
 * Centralized input validation utilities.
 *
 * These helpers keep server actions safe without adding a full schema library
 * (zod) to the dependency tree — the project only needs simple constraints
 * (max length, enum whitelist, numeric range).
 */

const MAX_NAME_LENGTH = 255
const MAX_DESCRIPTION_LENGTH = 5_000
const MAX_URL_LENGTH = 2_048
const MAX_TEXT_LENGTH = 10_000

export function validateProductName(name: unknown): string {
  if (typeof name !== "string") throw new Error("Nome do produto inválido")
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error("Nome do produto é obrigatório")
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Nome do produto deve ter no máximo ${MAX_NAME_LENGTH} caracteres`)
  }
  return trimmed
}

export function validateProductDescription(description: unknown): string | null {
  if (description === null || description === undefined) return null
  if (typeof description !== "string") return null
  return description.trim().slice(0, MAX_DESCRIPTION_LENGTH) || null
}

export function validateImageUrl(url: unknown): string | null {
  if (url === null || url === undefined) return null
  if (typeof url !== "string") return null
  const trimmed = url.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new Error("URL da imagem muito longa")
  }
  // Only allow http(s) URLs; block javascript:, data:, etc.
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("URL da imagem deve começar com http:// ou https://")
  }
  return trimmed
}

export function validateProductStatus(status: unknown): "active" | "inactive" {
  if (status === "active" || status === "inactive") return status
  throw new Error("Status inválido. Use 'active' ou 'inactive'.")
}

export function validateDeliveryType(dt: unknown): "stock" | "manual" {
  if (dt === "stock" || dt === "manual") return dt
  throw new Error("Tipo de entrega inválido. Use 'stock' ou 'manual'.")
}

export function validatePositiveNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} deve ser um número positivo`)
  }
  return value
}

export function validateInteger(value: unknown, label: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error(`${label} deve ser um inteiro não negativo`)
  }
  return n
}

/**
 * Validates Telegram admin IDs (must be numeric strings).
 * Returns a filtered, deduplicated array of valid IDs.
 */
export function validateAdminIds(raw: unknown): string[] {
  if (typeof raw !== "string") throw new Error("Lista de admins inválida")
  return [...new Set(
    raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && /^\d{6,20}$/.test(s))
  )]
}

/**
 * Validates an email string with a basic regex.
 */
export function validateEmail(email: unknown): string {
  if (typeof email !== "string") throw new Error("Email inválido")
  const trimmed = email.trim().toLowerCase()
  if (trimmed.length === 0 || trimmed.length > 320) {
    throw new Error("Email inválido")
  }
  // Basic RFC 5322-ish validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("Email inválido")
  }
  return trimmed
}

/**
 * Validates a webhook URL, blocking private/loopback addresses.
 */
export function validateWebhookUrl(url: unknown): string {
  if (typeof url !== "string") throw new Error("URL inválida")
  const trimmed = url.trim()
  if (!/^https:\/\//i.test(trimmed)) {
    throw new Error("URL deve usar HTTPS")
  }
  try {
    const parsed = new URL(trimmed)
    const hostname = parsed.hostname.toLowerCase()
    // Block private/loopback/metadata addresses
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname === "169.254.169.254" || // AWS metadata
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      throw new Error("URL inválida: endereços privados não são permitidos")
    }
  } catch {
    throw new Error("URL inválida")
  }
  return trimmed
}

/**
 * Whitelists for enum fields — prevents Mass Assignment via arbitrary values.
 */
export const VALID_PRODUCT_STATUS = new Set(["active", "inactive"])
export const VALID_DELIVERY_TYPE = new Set(["stock", "manual"])
export const VALID_PAYMENT_STATUS = new Set(["pending", "approved", "refused", "cancelled"])
export const VALID_DELIVERY_STATUS = new Set(["pending", "delivered", "cancelled"])

/**
 * Validates and sanitizes a URL for general use (buttons, support links).
 * Only allows safe protocols to prevent javascript:/data: injections.
 */
export function validateSafeUrl(url: unknown, label = "URL"): string {
  if (typeof url !== "string") return ""
  const trimmed = url.trim()
  if (trimmed.length === 0) return ""
  if (trimmed.length > MAX_URL_LENGTH) throw new Error(`${label} muito longa`)
  
  try {
    const u = new URL(trimmed)
    if (!["http:", "https:", "mailto:", "tel:"].includes(u.protocol)) {
      throw new Error(`Protocolo da ${label} não permitido. Use http, https, mailto ou tel.`)
    }
    return u.toString()
  } catch (err) {
    if (err instanceof Error && err.message.includes("Protocolo")) throw err
    throw new Error(`${label} inválida.`)
  }
}

/**
 * Basic sanitization for Telegram HTML messages.
 * Telegram only supports a small subset of tags. This helper ensures we only
 * allow supported tags and helps prevent broken markup.
 */
export function sanitizeTelegramHtml(html: unknown): string {
  if (typeof html !== "string") return ""
  return html
    .replace(/<(?!\/?(b|i|u|s|code|pre|a|em|strong|ins|strike|del|span|tg-emoji|tg-spoiler)\b)[^>]+>/gi, "")
    .trim()
}

/**
 * Sanitizes a filename to prevent path traversal and shell metacharacter issues.
 */
export function sanitizeFileName(name: unknown): string {
  if (typeof name !== "string") return "arquivo"
  return name
    .replace(/[\/\\]/g, "_") // No path separators
    .replace(/^\.+/, "")      // No leading dots
    .replace(/[<>:"|?*]/g, "") // No Windows-forbidden chars
    .trim() || "arquivo"
}

/**
 * Sanitizes a display name (like Telegram firstName) to prevent XSS in the panel.
 */
export function sanitizeDisplayName(name: unknown): string {
  if (typeof name !== "string") return ""
  return name.replace(/<[^>]*>?/gm, "").trim()
}
