const MAX_URL_LENGTH = 2_048

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:", "tg:"])

const ALLOWED_TAGS = new Set([
  "b",
  "i",
  "u",
  "s",
  "code",
  "pre",
  "a",
  "em",
  "strong",
  "ins",
  "strike",
  "del",
  "span",
  "tg-emoji",
  "tg-spoiler",
])

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  colon: ":",
  tab: "\t",
  newline: "\n",
}

/** Escapes a value for insertion into HTML text or an HTML attribute. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;"
      case "<": return "&lt;"
      case ">": return "&gt;"
      case '"': return "&quot;"
      case "'": return "&#39;"
      default: return character
    }
  })
}

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(?:#x([0-9a-f]{1,6})|#([0-9]{1,7})|([a-z][a-z0-9]+));?/gi,
    (whole, hex, decimal, named) => {
      if (hex) {
        const codePoint = Number.parseInt(hex, 16)
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : whole
      }
      if (decimal) {
        const codePoint = Number.parseInt(decimal, 10)
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : whole
      }
      return HTML_ENTITIES[named.toLowerCase()] ?? whole
    },
  )
}

function decodePercentEncoding(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Normalizes only the portion used to identify a URL protocol. It repeatedly
 * decodes entities and percent-encoding, then removes controls and whitespace
 * that attackers commonly place between protocol characters.
 */
function normalizeProtocolProbe(value: string): string {
  let normalized = value.normalize("NFKC")
  for (let i = 0; i < 4; i += 1) {
    const decoded = decodeHtmlEntities(decodePercentEncoding(normalized))
    const cleaned = decoded.replace(/[\u0000-\u0020\u007f-\u009f\u00a0\u200b-\u200f\u2028\u2029\u2060\ufeff]/g, "")
    if (cleaned === normalized) return cleaned.toLowerCase()
    normalized = cleaned
  }
  return normalized.toLowerCase()
}

/**
 * Validates absolute URLs against a small allowlist. Relative URLs are not
 * accepted because the current preview/editor flows do not require them.
 */
export function validateSafeUrl(url: unknown, label = "URL"): string {
  if (typeof url !== "string") return ""
  const trimmed = url.trim()
  if (trimmed.length === 0) return ""
  if (trimmed.length > MAX_URL_LENGTH) throw new Error(`${label} muito longa`)

  const protocolProbe = normalizeProtocolProbe(trimmed)
  const protocolMatch = protocolProbe.match(/^([a-z][a-z0-9+.-]*):/i)
  if (!protocolMatch) throw new Error(`${label} inválida.`)

  const protocol = `${protocolMatch[1].toLowerCase()}:`
  if (!SAFE_PROTOCOLS.has(protocol)) {
    throw new Error(`Protocolo da ${label} não permitido.`)
  }

  const normalizedUrl = decodeHtmlEntities(trimmed)
  let parsed: URL
  try {
    parsed = new URL(normalizedUrl)
  } catch {
    throw new Error(`${label} inválida.`)
  }

  if (!SAFE_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
    throw new Error(`Protocolo da ${label} não permitido.`)
  }

  return parsed.toString()
}

/** Accepts only non-empty decimal digits for Telegram custom emoji IDs. */
export function validateTelegramEmojiId(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null
  return value
}

type ParsedAttribute = { name: string; value: string }

function parseAttributes(source: string): ParsedAttribute[] {
  const attributes: ParsedAttribute[] = []
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null
  while ((match = attributePattern.exec(source)) !== null) {
    const name = match[1].toLowerCase()
    if (name === "a" || name === "tg-emoji") continue
    attributes.push({ name, value: match[2] ?? match[3] ?? match[4] ?? "" })
  }
  return attributes
}

function renderTag(rawTag: string, decorateLinks: boolean): string {
  const closing = rawTag.match(/^<\s*\/\s*([a-z][a-z0-9-]*)\s*>$/i)
  if (closing) {
    const name = closing[1].toLowerCase()
    return ALLOWED_TAGS.has(name) ? `</${name}>` : ""
  }

  const opening = rawTag.match(/^<\s*([a-z][a-z0-9-]*)([\s\S]*?)\s*\/?>$/i)
  if (!opening) return ""

  const name = opening[1].toLowerCase()
  if (!ALLOWED_TAGS.has(name)) return ""

  const attributes = parseAttributes(opening[2])
  if (name === "a") {
    const hrefAttributes = attributes.filter((attribute) => attribute.name === "href")
    if (hrefAttributes.length !== 1) return ""
    let href = ""
    try {
      href = validateSafeUrl(hrefAttributes[0].value, "URL do link")
    } catch {
      return ""
    }
    const safeHref = escapeHtml(href)
    return decorateLinks
      ? `<a href="${safeHref}" class="text-primary underline" target="_blank" rel="noreferrer">`
      : `<a href="${safeHref}">`
  }

  if (name === "tg-emoji") {
    if (attributes.some((attribute) => attribute.name !== "emoji-id")) return ""
    const emojiAttributes = attributes.filter((attribute) => attribute.name === "emoji-id")
    if (emojiAttributes.length !== 1) return ""
    const emojiId = validateTelegramEmojiId(emojiAttributes[0].value)
    if (!emojiId) return ""
    return `<tg-emoji emoji-id="${escapeHtml(emojiId)}">`
  }

  // All other supported tags intentionally receive no user-controlled attrs.
  return `<${name}>`
}

function sanitizeMarkup(input: string, decorateLinks: boolean): string {
  const tagPattern = /<!--[\s\S]*?-->|<\/?[a-z][^>]*>/gi
  let output = ""
  let lastIndex = 0

  for (const match of input.matchAll(tagPattern)) {
    const index = match.index ?? 0
    output += escapeHtml(input.slice(lastIndex, index))
    output += renderTag(match[0], decorateLinks)
    lastIndex = index + match[0].length
  }

  output += escapeHtml(input.slice(lastIndex))
  return output
}

/** Sanitizes Telegram HTML for server-side persistence. */
export function sanitizeTelegramHtml(input: unknown): string {
  if (typeof input !== "string") return ""
  return sanitizeMarkup(input, false).trim().slice(0, 5_000)
}

/** Renders the supported Telegram HTML subset for the browser preview. */
export function renderTelegramHtml(input: string): string {
  return sanitizeMarkup(input, true).replace(/\n/g, "<br/>")
}

function renderMarkdownText(input: string): string {
  return escapeHtml(input)
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*([^*\n]+)\*/g, "<b>$1</b>")
    .replace(/_([^_\n]+)_/g, "<i>$1</i>")
    .replace(/\n/g, "<br/>")
}

/**
 * Renders a deliberately small Markdown subset. Invalid links remain visible
 * as escaped text instead of becoming executable anchors.
 */
export function renderTelegramMarkdown(input: string): string {
  const linkPattern = /\[([^\]\n]+)\]\(([^)\r\n]+)\)/g
  let output = ""
  let lastIndex = 0

  for (const match of input.matchAll(linkPattern)) {
    const index = match.index ?? 0
    output += renderMarkdownText(input.slice(lastIndex, index))

    const label = renderMarkdownText(match[1])
    let safeUrl = ""
    try {
      safeUrl = validateSafeUrl(match[2], "URL do link")
    } catch {
      // Keep the label and URL as inert, escaped text when validation fails.
      output += `${label} (${escapeHtml(match[2])})`
      lastIndex = index + match[0].length
      continue
    }

    output += `<a href="${escapeHtml(safeUrl)}" class="text-primary underline" target="_blank" rel="noreferrer">${label}</a>`
    lastIndex = index + match[0].length
  }

  output += renderMarkdownText(input.slice(lastIndex))
  return output
}
