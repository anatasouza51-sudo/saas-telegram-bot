// Shared, framework-agnostic button model used by the editor, the live
// preview and the server-side sender. No server-only imports here.

export type ButtonType =
  | "url"
  | "callback"
  | "deeplink"
  | "telegram"
  | "whatsapp"
  | "instagram"
  | "site"

export type PostButton = {
  text: string
  type: ButtonType
  value: string
}

// A post keyboard is an array of rows, each row an array of buttons.
export type ButtonRows = PostButton[][]

export const BUTTON_TYPE_LABELS: Record<ButtonType, string> = {
  url: "URL",
  site: "Site",
  callback: "Callback",
  deeplink: "Deep Link",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
}

// Resolves a button to the href it points at (empty string for callback).
export function resolveButtonUrl(btn: PostButton): string {
  const v = btn.value.trim()
  switch (btn.type) {
    case "url":
    case "site":
    case "deeplink":
      return v
    case "telegram":
      return v.startsWith("http") ? v : `https://t.me/${v.replace(/^@/, "")}`
    case "whatsapp":
      return v.startsWith("http")
        ? v
        : `https://wa.me/${v.replace(/[^0-9]/g, "")}`
    case "instagram":
      return v.startsWith("http")
        ? v
        : `https://instagram.com/${v.replace(/^@/, "")}`
    case "callback":
      return ""
    default:
      return v
  }
}

// Converts stored button rows into a Telegram inline_keyboard payload,
// dropping empty buttons/rows.
export function toInlineKeyboard(rows: ButtonRows) {
  const keyboard = rows
    .map((row) =>
      row
        .filter((b) => b.text.trim() && b.value.trim())
        .map((b) => {
          if (b.type === "callback") {
            return { text: b.text, callback_data: b.value.slice(0, 64) }
          }
          return { text: b.text, url: resolveButtonUrl(b) }
        }),
    )
    .filter((row) => row.length > 0)
  return keyboard.length ? { inline_keyboard: keyboard } : undefined
}

// Safe JSON parse for stored button rows.
export function parseButtons(json: string | null | undefined): ButtonRows {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed as ButtonRows
  } catch {
    return []
  }
}
