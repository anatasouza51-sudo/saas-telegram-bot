import "server-only"
import { sanitizeTelegramHtml as sanitizeSafeTelegramHtml } from "./html-safety"

/**
 * Centralized input validation utilities.
 *
 * These helpers keep server actions safe without adding a full schema library
 * (zod) to the dependency tree — the project only needs simple constraints
 * (max length, enum whitelist, numeric range).
 *
 * All string-based sanitizers (sanitizeTelegramHtml, sanitizeDisplayName,
 * sanitizeFileName) are wrapped by size-limiting helpers so that upstream
 * callers cannot persist unbounded payloads.
 */

const MAX_NAME_LENGTH = 255
const MAX_DESCRIPTION_LENGTH = 5_000
const MAX_URL_LENGTH = 2_048
const MAX_TEXT_LENGTH = 10_000

// ---------------------------------------------------------------------------
// Telegram-specific content limits
// ---------------------------------------------------------------------------
// Telegram imposes its own caps on messages (4 096 chars for normal users,
// 8 192 for premium accounts). Users asked for a 5 000 char ceiling on the
// post editor; oversized sends are split downstream, but the boundary here
// prevents absurd payloads (e.g. 100k-char pasted scripts) from being saved.
const MAX_TELEGRAM_MESSAGE_LENGTH = 5_000
// Telegram post titles / template names / folder names should stay short.
const MAX_TITLE_LENGTH = 255
// Stock item content per line (e.g. license keys, serials).
const MAX_STOCK_LINE_LENGTH = 500
// Maximum number of stock lines in a single bulk add.
const MAX_STOCK_LINES = 500
// Maximum number of button rows / buttons per row for Telegram inline keyboards.
const MAX_BUTTON_ROWS = 6
const MAX_BUTTONS_PER_ROW = 6
// Telegram callback_data is capped at 64 bytes server-side.
const MAX_CALLBACK_DATA_LENGTH = 64
const MAX_BUTTON_TEXT_LENGTH = 128
const MAX_BUTTON_VALUE_LENGTH = 256
// Maximum number of targets for a schedule / automation / template.
const MAX_TARGETS_COUNT = 200
// Maximum serialized JSON blob size for buttons / targets / recurrence etc.
const MAX_SERIALIZED_JSON_LENGTH = 10_000
// Recurrence / timezone fields.
const MAX_TIMEZONE_LENGTH = 100
// Admin name / profile name.
const MAX_ADMIN_NAME_LENGTH = 100
// Category / topic name.
const MAX_CATEGORY_NAME_LENGTH = 128
// Category description.
const MAX_CATEGORY_DESCRIPTION_LENGTH = 1_000
// Support config fields.
const MAX_SUPPORT_MESSAGE_LENGTH = 2_000
const MAX_SUPPORT_LABEL_LENGTH = 100
const MAX_SUPPORT_HOURS_LENGTH = 200
const MAX_SUPPORT_TELEGRAM_USERNAME_LENGTH = 50
// Customization welcome message.
const MAX_WELCOME_MESSAGE_LENGTH = 4_000
// Automation name.
const MAX_AUTOMATION_NAME_LENGTH = 128
const MAX_AUTOMATION_CUSTOM_TEXT_LENGTH = 4_000
// Coupon code (already validated by length, but exported constant for reference).
const MAX_COUPON_CODE_LENGTH = 30
// PIX config text fields.
const MAX_PIX_TEXT_LENGTH = 500
const MAX_PIX_BUTTON_TEXT_LENGTH = 64
// Catalog config button text.
const MAX_CATALOG_BUTTON_TEXT_LENGTH = 64
// Gateway / VeoPag keys.
const MAX_GATEWAY_KEY_LENGTH = 1_024
// Store webhook secret — already generated internally, but bounded.
const MAX_WEBHOOK_SECRET_LENGTH = 128
// Log details.
const MAX_LOG_DETAILS_LENGTH = 2_000
const MAX_LOG_ACTION_LENGTH = 500
// Telegram channel title / topic name.
const MAX_CHAT_TITLE_LENGTH = 255
const MAX_TOPIC_NAME_LENGTH = 128
// Bot token.
const MAX_BOT_TOKEN_LENGTH = 256
// Channel manual add raw input.
const MAX_CHANNEL_INPUT_LENGTH = 128
// Post search query.
const MAX_SEARCH_QUERY_LENGTH = 256
// Profile image URL.
const MAX_PROFILE_IMAGE_URL_LENGTH = 2_048

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
/** Normalizes and validates the payer name required by Oasy.fy. */
export function validatePayerName(name: unknown): string {
  if (typeof name !== "string") throw new Error("Nome do pagador inválido")
  const trimmed = name
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (trimmed.length < 3) {
    throw new Error("Nome do pagador deve ter pelo menos 3 caracteres.")
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Nome do pagador deve ter no máximo ${MAX_NAME_LENGTH} caracteres`)
  }
  return trimmed
}

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
/**
 * Normalizes and validates a Brazilian phone number for payment providers.
 * The Oasy.fy national format accepts 10 or 11 digits, with or without
 * formatting. A Brazilian country-code prefix is accepted and removed.
 */
export function validateBrazilianPhone(phone: unknown): string {
  if (typeof phone !== "string") throw new Error("Telefone inválido")
  let digits = phone.replace(/\D/g, "")
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2)
  }
  if (!/^\d{10,11}$/.test(digits) || /^([0-9])\1+$/.test(digits)) {
    throw new Error("Telefone inválido. Envie DDD e número, por exemplo (11) 99999-9999.")
  }
  return digits
}

function hasRepeatedDigits(digits: string): boolean {
  return /^([0-9])\1+$/.test(digits)
}

function validateCpf(digits: string): boolean {
  if (digits.length !== 11 || hasRepeatedDigits(digits)) return false
  let sum = 0
  for (let index = 0; index < 9; index += 1) sum += Number(digits[index]) * (10 - index)
  let remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  if (remainder !== Number(digits[9])) return false
  sum = 0
  for (let index = 0; index < 10; index += 1) sum += Number(digits[index]) * (11 - index)
  remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  return remainder === Number(digits[10])
}

function validateCnpj(digits: string): boolean {
  if (digits.length !== 14 || hasRepeatedDigits(digits)) return false
  const calculateDigit = (length: number): number => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = digits
      .slice(0, length)
      .split("")
      .reduce((total, value, index) => total + Number(value) * weights[index], 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  return calculateDigit(12) === Number(digits[12]) && calculateDigit(13) === Number(digits[13])
}

/** Normalizes and validates a CPF or CNPJ without logging or returning raw input. */
export function validateBrazilianDocument(document: unknown): string {
  if (typeof document !== "string") throw new Error("CPF/CNPJ inválido")
  const digits = document.replace(/\D/g, "")
  if (!validateCpf(digits) && !validateCnpj(digits)) {
    throw new Error("CPF/CNPJ inválido. Confira os dígitos e tente novamente.")
  }
  return digits
}

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

/** Centralized safe URL policy shared by server actions, editor and renderers. */
export { validateSafeUrl } from "./html-safety"

// ---------------------------------------------------------------------------
// Bounded sanitizers — wrappers that enforce max length before returning
// ---------------------------------------------------------------------------

/**
 * Sanitizes Telegram HTML and enforces a max length to prevent oversized
 * messages that could break the Telegram Bot API.
 */
export function sanitizeTelegramHtml(html: unknown): string {
  return sanitizeSafeTelegramHtml(html)
}

/**
 * Sanitizes a filename to prevent path traversal and shell metacharacter issues.
 * Enforces a max length.
 */
export function sanitizeFileName(name: unknown): string {
  if (typeof name !== "string") return "arquivo"
  return name
    .replace(/[\/\\]/g, "_") // No path separators
    .replace(/^\.+/, "")      // No leading dots
    .replace(/[<>:"|?*]/g, "") // No Windows-forbidden chars
    .trim()
    .slice(0, MAX_NAME_LENGTH) || "arquivo"
}

/**
 * Sanitizes a display name and enforces a max length to prevent oversized
 * payloads being persisted.
 */
export function sanitizeDisplayName(name: unknown): string {
  if (typeof name !== "string") return ""
  return name.replace(/<[^>]*>?/gm, "").trim().slice(0, MAX_TITLE_LENGTH)
}

// ---------------------------------------------------------------------------
// Telegram content validators (posts, templates, automations)
// ---------------------------------------------------------------------------

/**
 * Validates a Telegram post / template text with an explicit max length.
 * Returns the trimmed text (or null if empty).
 */
export function validateTelegramText(text: unknown): string | null {
  if (text === null || text === undefined) return null
  if (typeof text !== "string") return null
  const trimmed = text.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > MAX_TELEGRAM_MESSAGE_LENGTH) {
    throw new Error(`Texto muito longo. Máximo de ${MAX_TELEGRAM_MESSAGE_LENGTH} caracteres.`)
  }
  return trimmed
}

/**
 * Validates a title / name field (post title, template name, folder name, etc.).
 */
export function validateTitle(name: unknown, label = "Nome"): string {
  if (typeof name !== "string") throw new Error(`${label} inválido`)
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error(`${label} é obrigatório`)
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new Error(`${label} deve ter no máximo ${MAX_TITLE_LENGTH} caracteres`)
  }
  return trimmed
}

/**
 * Validates a category name.
 */
export function validateCategoryName(name: unknown): string {
  if (typeof name !== "string") throw new Error("Nome da categoria inválido")
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error("Nome da categoria é obrigatório")
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    throw new Error(`Nome da categoria deve ter no máximo ${MAX_CATEGORY_NAME_LENGTH} caracteres`)
  }
  return trimmed
}

/**
 * Validates a category description.
 */
export function validateCategoryDescription(description: unknown): string | null {
  if (description === null || description === undefined) return null
  if (typeof description !== "string") return null
  const trimmed = description.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > MAX_CATEGORY_DESCRIPTION_LENGTH) {
    throw new Error(`Descrição deve ter no máximo ${MAX_CATEGORY_DESCRIPTION_LENGTH} caracteres`)
  }
  return trimmed
}

/**
 * Validates a topic name.
 */
export function validateTopicName(name: unknown): string {
  if (typeof name !== "string") throw new Error("Nome do tópico inválido")
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error("Nome do tópico é obrigatório")
  if (trimmed.length > MAX_TOPIC_NAME_LENGTH) {
    throw new Error(`Nome do tópico deve ter no máximo ${MAX_TOPIC_NAME_LENGTH} caracteres`)
  }
  return trimmed
}

/**
 * Validates a post / template title field.
 */
export function validatePostTitle(title: unknown): string | null {
  if (title === null || title === undefined) return null
  if (typeof title !== "string") return null
  const trimmed = title.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new Error(`Título deve ter no máximo ${MAX_TITLE_LENGTH} caracteres`)
  }
  return trimmed
}

/**
 * Validates a serialized JSON blob (buttons, mediaIds, targets, recurrence, etc.)
 * to prevent unbounded arrays from being persisted.
 */
export function validateSerializedJson(raw: unknown, label = "Dados"): string {
  if (raw === null || raw === undefined) return "[]"
  let str: string
  if (typeof raw === "string") {
    str = raw
  } else {
    str = JSON.stringify(raw)
  }
  if (str.length > MAX_SERIALIZED_JSON_LENGTH) {
    throw new Error(`${label} excede o tamanho máximo permitido (${MAX_SERIALIZED_JSON_LENGTH} caracteres)`)
  }
  // Verify it is valid JSON
  try {
    JSON.parse(str)
  } catch {
    throw new Error(`${label} não é um JSON válido`)
  }
  return str
}

/**
 * Validates and sanitizes button rows for Telegram posts / templates.
 * Enforces limits on rows, buttons per row, and text/value lengths.
 */
export function validateButtonRows(
  rows: unknown,
  label = "Botões",
): string {
  if (rows === null || rows === undefined || (Array.isArray(rows) && rows.length === 0)) {
    return "[]"
  }
  let parsed: unknown
  if (typeof rows === "string") {
    try {
      parsed = JSON.parse(rows)
    } catch {
      throw new Error(`${label}: formato inválido`)
    }
  } else {
    parsed = rows
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${label}: deve ser um array de linhas`)
  }
  if (parsed.length > MAX_BUTTON_ROWS) {
    throw new Error(`${label}: máximo de ${MAX_BUTTON_ROWS} linhas`)
  }
  const cleaned: any[][] = []
  for (const row of parsed) {
    if (!Array.isArray(row)) continue
    if (row.length > MAX_BUTTONS_PER_ROW) {
      throw new Error(`${label}: máximo de ${MAX_BUTTONS_PER_ROW} botões por linha`)
    }
    const cleanedRow = row
      .filter((btn: any) => btn && typeof btn === "object" && typeof btn.text === "string" && typeof btn.value === "string" && typeof btn.type === "string")
      .map((btn: any) => {
        const text = (btn.text || "").trim().slice(0, MAX_BUTTON_TEXT_LENGTH)
        const value = (btn.value || "").trim().slice(0, MAX_BUTTON_VALUE_LENGTH)
        const type = ["url", "callback", "deeplink", "telegram", "whatsapp", "instagram", "site"].includes(btn.type) ? btn.type : "url"
        // callback_data must not exceed 64 bytes (Telegram limit)
        if (type === "callback" && Buffer.byteLength(value, "utf-8") > MAX_CALLBACK_DATA_LENGTH) {
          throw new Error(`${label}: callback_data deve ter no máximo ${MAX_CALLBACK_DATA_LENGTH} bytes`)
        }
        return { text, value, type }
      })
      .filter((btn: any) => btn.text.length > 0 && btn.value.length > 0)
    if (cleanedRow.length > 0) cleaned.push(cleanedRow)
  }
  return JSON.stringify(cleaned)
}

// ---------------------------------------------------------------------------
// Stock validators
// ---------------------------------------------------------------------------

/**
 * Validates a bulk stock input: splits by lines, enforces per-line and total
 * limits, and returns the cleaned array of non-empty trimmed lines.
 */
export function validateStockInput(raw: unknown): string[] {
  if (typeof raw !== "string") throw new Error("Entrada de estoque inválida")
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) throw new Error("Nenhum item informado")
  if (lines.length > MAX_STOCK_LINES) {
    throw new Error(`Máximo de ${MAX_STOCK_LINES} itens por operação`)
  }
  return lines.map((line) => {
    if (line.length > MAX_STOCK_LINE_LENGTH) {
      throw new Error(`Item excede ${MAX_STOCK_LINE_LENGTH} caracteres`)
    }
    return line
  })
}

// ---------------------------------------------------------------------------
// Profile validators
// ---------------------------------------------------------------------------

/**
 * Validates a profile / admin name.
 */
export function validateProfileName(name: unknown): string {
  if (typeof name !== "string") throw new Error("Nome inválido")
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error("Nome é obrigatório")
  if (trimmed.length > MAX_ADMIN_NAME_LENGTH) {
    throw new Error(`Nome deve ter no máximo ${MAX_ADMIN_NAME_LENGTH} caracteres`)
  }
  return trimmed
}

/**
 * Validates a profile image URL.
 */
/**
 * Valida uma imagem de perfil (pode ser URL ou Data URL de base64).
 * Implementa restrições rigorosas de tamanho e tipo para evitar abusos.
 */
export function validateProfileImage(image: unknown): string | null {
  if (image === null || image === undefined) return null
  if (typeof image !== "string") return null
  const trimmed = image.trim()
  if (trimmed.length === 0) return null

  // 1. Se for Data URL (Base64 vindo do frontend)
  if (trimmed.startsWith("data:image/")) {
    // Limite de 1.5MB para a string base64 (aproximadamente 1MB de binário)
    const MAX_BASE64_SIZE = 1.5 * 1024 * 1024
    if (trimmed.length > MAX_BASE64_SIZE) {
      throw new Error("A imagem de perfil é muito grande (máximo 1MB)")
    }
    
    // Validar tipos permitidos no prefixo
    if (!/^data:image\/(jpeg|png|webp|gif);base64,/i.test(trimmed)) {
      throw new Error("Formato de imagem base64 não suportado. Use JPEG, PNG, WEBP ou GIF.")
    }
    
    return trimmed
  }

  // 2. Se for URL externa
  if (trimmed.length > MAX_PROFILE_IMAGE_URL_LENGTH) {
    throw new Error("URL da imagem muito longa")
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("URL da imagem deve começar com http:// ou https://")
  }
  
  // Bloquear URLs de metadados ou locais (SSRF Prevention)
  try {
    const url = new URL(trimmed)
    const host = url.hostname.toLowerCase()
    if (["localhost", "127.0.0.1", "169.254.169.254"].includes(host)) {
      throw new Error("URL de imagem inválida")
    }
  } catch {
    throw new Error("URL de imagem inválida")
  }

  return trimmed
}

// ---------------------------------------------------------------------------
// Settings / support / customization validators
// ---------------------------------------------------------------------------

/**
 * Validates a support config label.
 */
export function validateSupportLabel(label: unknown): string {
  if (typeof label !== "string") throw new Error("Label inválido")
  const trimmed = label.trim().slice(0, MAX_SUPPORT_LABEL_LENGTH)
  if (trimmed.length === 0) throw new Error("Label é obrigatório")
  return trimmed
}

/**
 * Validates a support config message.
 */
export function validateSupportMessage(msg: unknown): string {
  if (typeof msg !== "string") throw new Error("Mensagem inválida")
  const trimmed = msg.trim().slice(0, MAX_SUPPORT_MESSAGE_LENGTH)
  if (trimmed.length === 0) throw new Error("Mensagem é obrigatória")
  return trimmed
}

/**
 * Validates a support hours string.
 */
export function validateSupportHours(hours: unknown): string {
  if (typeof hours !== "string") return ""
  return hours.trim().slice(0, MAX_SUPPORT_HOURS_LENGTH)
}

/**
 * Validates a Telegram username for support.
 */
export function validateSupportTelegramUsername(username: unknown): string {
  if (typeof username !== "string") return ""
  return username.replace(/^@/, "").trim().slice(0, MAX_SUPPORT_TELEGRAM_USERNAME_LENGTH)
}

/**
 * Validates a welcome message for store customization.
 */
export function validateWelcomeMessage(msg: unknown): string {
  if (typeof msg !== "string") throw new Error("Mensagem de boas-vindas inválida")
  return msg.trim().slice(0, MAX_WELCOME_MESSAGE_LENGTH)
}

// ---------------------------------------------------------------------------
// Automation validators
// ---------------------------------------------------------------------------

/**
 * Validates an automation name.
 */
export function validateAutomationName(name: unknown): string {
  if (typeof name !== "string") throw new Error("Nome inválido")
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error("Nome é obrigatório")
  if (trimmed.length > MAX_AUTOMATION_NAME_LENGTH) {
    throw new Error(`Nome deve ter no máximo ${MAX_AUTOMATION_NAME_LENGTH} caracteres`)
  }
  return trimmed
}

/**
 * Validates an automation custom text.
 */
export function validateAutomationCustomText(text: unknown): string | null {
  if (text === null || text === undefined) return null
  if (typeof text !== "string") return null
  const trimmed = text.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > MAX_AUTOMATION_CUSTOM_TEXT_LENGTH) {
    throw new Error(`Texto personalizado deve ter no máximo ${MAX_AUTOMATION_CUSTOM_TEXT_LENGTH} caracteres`)
  }
  return trimmed
}

/**
 * Validates automation / schedule targets (array of target tokens).
 */
export function validateTargets(targets: unknown): string[] {
  if (!Array.isArray(targets)) throw new Error("Destinos inválidos")
  if (targets.length === 0) throw new Error("Selecione ao menos um destino")
  if (targets.length > MAX_TARGETS_COUNT) {
    throw new Error(`Máximo de ${MAX_TARGETS_COUNT} destinos`)
  }
  return targets
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length <= MAX_CHAT_TITLE_LENGTH)
}

/**
 * Validates a timezone string.
 */
export function validateTimezone(tz: unknown): string {
  if (typeof tz !== "string") throw new Error("Timezone inválido")
  const trimmed = tz.trim()
  if (trimmed.length === 0) throw new Error("Timezone é obrigatório")
  if (trimmed.length > MAX_TIMEZONE_LENGTH) {
    throw new Error("Timezone muito longo")
  }
  return trimmed
}

/**
 * Validates a recurrence JSON blob.
 */
export function validateRecurrence(rec: unknown): string {
  let str: string
  if (typeof rec === "string") {
    str = rec
  } else {
    str = JSON.stringify(rec)
  }
  if (str.length > MAX_SERIALIZED_JSON_LENGTH) {
    throw new Error("Recorrência excede o tamanho máximo permitido")
  }
  try {
    JSON.parse(str)
  } catch {
    throw new Error("Recorrência não é um JSON válido")
  }
  return str
}

// ---------------------------------------------------------------------------
// Gateway / VeoPag validators
// ---------------------------------------------------------------------------

/**
 * Validates a gateway public key.
 */
export function validateGatewayKey(key: unknown, label = "Chave"): string {
  if (typeof key !== "string") throw new Error(`${label} inválida`)
  const trimmed = key.trim()
  if (trimmed.length === 0) throw new Error(`${label} é obrigatória`)
  if (trimmed.length > MAX_GATEWAY_KEY_LENGTH) {
    throw new Error(`${label} muito longa (máximo ${MAX_GATEWAY_KEY_LENGTH} caracteres)`)
  }
  return trimmed
}

/**
 * Validates a bot token (Telegram).
 */
export function validateBotToken(token: unknown): string {
  if (typeof token !== "string") throw new Error("Token inválido")
  const trimmed = token.trim()
  if (trimmed.length === 0) throw new Error("Token é obrigatório")
  if (trimmed.length > MAX_BOT_TOKEN_LENGTH) {
    throw new Error("Token muito longo")
  }
  return trimmed
}

// ---------------------------------------------------------------------------
// Channel / topic validators
// ---------------------------------------------------------------------------

/**
 * Validates a chat title from Telegram.
 */
export function validateChatTitle(title: unknown): string {
  if (typeof title !== "string") return "Grupo"
  return title.trim().slice(0, MAX_CHAT_TITLE_LENGTH) || "Grupo"
}

/**
 * Validates a channel manual add input.
 */
export function validateChannelInput(input: unknown): string {
  if (typeof input !== "string") throw new Error("Entrada inválida")
  const trimmed = input.trim()
  if (trimmed.length === 0) throw new Error("Informe um Chat ID ou @username")
  if (trimmed.length > MAX_CHANNEL_INPUT_LENGTH) {
    throw new Error("Entrada muito longa")
  }
  return trimmed
}

// ---------------------------------------------------------------------------
// Search / misc validators
// ---------------------------------------------------------------------------

/**
 * Validates a search query string.
 */
export function validateSearchQuery(q: unknown): string {
  if (typeof q !== "string") return ""
  return q.trim().slice(0, MAX_SEARCH_QUERY_LENGTH)
}

// ---------------------------------------------------------------------------
// Coupon (existing logic preserved, exported for consistency)
// ---------------------------------------------------------------------------

/**
 * Validates a coupon code string.
 */
export function validateCouponCode(code: unknown): string {
  if (typeof code !== "string") throw new Error("Código do cupom inválido")
  const trimmed = code.trim().toUpperCase()
  if (!trimmed) throw new Error("Código do cupom é obrigatório.")
  if (trimmed.length < 3 || trimmed.length > MAX_COUPON_CODE_LENGTH)
    throw new Error(`O código deve ter entre 3 e ${MAX_COUPON_CODE_LENGTH} caracteres.`)
  if (!/^[A-Z0-9_-]+$/.test(trimmed))
    throw new Error("O código só pode conter letras, números, _ e -.")
  return trimmed
}

// ---------------------------------------------------------------------------
// Discount validator (for coupons)
// ---------------------------------------------------------------------------

export function validateDiscount(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > 100)
    throw new Error("O desconto deve ser um número entre 1 e 100.")
  return Math.round(n)
}

// ---------------------------------------------------------------------------
// PIX config text validators
// ---------------------------------------------------------------------------

export function validatePixText(text: unknown): string {
  if (typeof text !== "string") throw new Error("Texto inválido")
  return text.trim().slice(0, MAX_PIX_TEXT_LENGTH)
}

export function validatePixButtonText(text: unknown): string {
  if (typeof text !== "string") throw new Error("Texto do botão inválido")
  return text.trim().slice(0, MAX_PIX_BUTTON_TEXT_LENGTH)
}

export function validateCatalogButtonText(text: unknown): string {
  if (typeof text !== "string") throw new Error("Texto do botão inválido")
  return text.trim().slice(0, MAX_CATALOG_BUTTON_TEXT_LENGTH)
}

// ---------------------------------------------------------------------------
// Log action / details validators
// ---------------------------------------------------------------------------

export function validateLogAction(action: unknown): string {
  if (typeof action !== "string") throw new Error("Ação inválida")
  return action.trim().slice(0, MAX_LOG_ACTION_LENGTH)
}

export function validateLogDetails(details: unknown): string | null {
  if (details === null || details === undefined) return null
  if (typeof details !== "string") return null
  return details.trim().slice(0, MAX_LOG_DETAILS_LENGTH)
}

// ---------------------------------------------------------------------------
// Export constants for use in other modules
// ---------------------------------------------------------------------------

export {
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_URL_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TELEGRAM_MESSAGE_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_STOCK_LINE_LENGTH,
  MAX_STOCK_LINES,
  MAX_BUTTON_ROWS,
  MAX_BUTTONS_PER_ROW,
  MAX_CALLBACK_DATA_LENGTH,
  MAX_BUTTON_TEXT_LENGTH,
  MAX_BUTTON_VALUE_LENGTH,
  MAX_TARGETS_COUNT,
  MAX_SERIALIZED_JSON_LENGTH,
  MAX_TIMEZONE_LENGTH,
  MAX_ADMIN_NAME_LENGTH,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CATEGORY_DESCRIPTION_LENGTH,
  MAX_SUPPORT_MESSAGE_LENGTH,
  MAX_SUPPORT_LABEL_LENGTH,
  MAX_SUPPORT_HOURS_LENGTH,
  MAX_SUPPORT_TELEGRAM_USERNAME_LENGTH,
  MAX_WELCOME_MESSAGE_LENGTH,
  MAX_AUTOMATION_NAME_LENGTH,
  MAX_AUTOMATION_CUSTOM_TEXT_LENGTH,
  MAX_COUPON_CODE_LENGTH,
  MAX_PIX_TEXT_LENGTH,
  MAX_PIX_BUTTON_TEXT_LENGTH,
  MAX_CATALOG_BUTTON_TEXT_LENGTH,
  MAX_GATEWAY_KEY_LENGTH,
  MAX_WEBHOOK_SECRET_LENGTH,
  MAX_LOG_DETAILS_LENGTH,
  MAX_LOG_ACTION_LENGTH,
  MAX_CHAT_TITLE_LENGTH,
  MAX_TOPIC_NAME_LENGTH,
  MAX_BOT_TOKEN_LENGTH,
  MAX_CHANNEL_INPUT_LENGTH,
  MAX_SEARCH_QUERY_LENGTH,
  MAX_PROFILE_IMAGE_URL_LENGTH,
}
