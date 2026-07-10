import { telegramConfig } from "@/lib/integrations"

const API_BASE = "https://api.telegram.org/bot"

type InlineButton = {
  text: string
  callback_data?: string
  url?: string
}

function apiUrl(method: string) {
  return `${API_BASE}${telegramConfig.botToken}/${method}`
}

async function callApi<T = unknown>(
  method: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; result?: T; description?: string }> {
  if (!telegramConfig.isConfigured) {
    return { ok: false, description: "TELEGRAM_BOT_TOKEN não configurado" }
  }
  try {
    const res = await fetch(apiUrl(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = (await res.json()) as {
      ok: boolean
      result?: T
      description?: string
    }
    return data
  } catch (err) {
    return {
      ok: false,
      description: err instanceof Error ? err.message : "Erro de rede",
    }
  }
}

export function buildInlineKeyboard(rows: InlineButton[][]) {
  return { inline_keyboard: rows }
}

export function sendMessage(
  chatId: string | number,
  text: string,
  options?: {
    replyMarkup?: ReturnType<typeof buildInlineKeyboard>
    parseMode?: "HTML" | "Markdown" | "MarkdownV2"
  },
) {
  return callApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode ?? "HTML",
    reply_markup: options?.replyMarkup,
    disable_web_page_preview: true,
  })
}

export function sendPhoto(
  chatId: string | number,
  photoUrl: string,
  caption?: string,
  replyMarkup?: ReturnType<typeof buildInlineKeyboard>,
) {
  return callApi("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  })
}

export function sendDocument(
  chatId: string | number,
  documentUrl: string,
  caption?: string,
) {
  return callApi("sendDocument", {
    chat_id: chatId,
    document: documentUrl,
    caption,
    parse_mode: "HTML",
  })
}

export function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return callApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  })
}

export function editMessageText(
  chatId: string | number,
  messageId: number,
  text: string,
  replyMarkup?: ReturnType<typeof buildInlineKeyboard>,
) {
  return callApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  })
}

export async function setWebhook(url: string) {
  return callApi("setWebhook", { url })
}

// Minimal shapes of the Telegram update payload we consume.
export type TelegramUpdate = {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; username?: string; first_name?: string }
    chat: { id: number }
    text?: string
  }
  callback_query?: {
    id: string
    from: { id: number; username?: string; first_name?: string }
    message?: { message_id: number; chat: { id: number } }
    data?: string
  }
}
