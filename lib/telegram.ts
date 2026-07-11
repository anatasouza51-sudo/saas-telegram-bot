const API_BASE = "https://api.telegram.org/bot"

type InlineButton = {
  text: string
  callback_data?: string
  url?: string
}

export function buildInlineKeyboard(rows: InlineButton[][]) {
  return { inline_keyboard: rows }
}

/**
 * A Telegram Bot API client bound to a single store's bot token.
 * Every store connects its own bot, so all sends go through an instance
 * created from that store's saved token.
 */
export class TelegramClient {
  constructor(private readonly token: string) {}

  private async callApi<T = unknown>(
    method: string,
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; result?: T; description?: string }> {
    if (!this.token) {
      return { ok: false, description: "Token do bot não configurado" }
    }
    try {
      const res = await fetch(`${API_BASE}${this.token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      return (await res.json()) as {
        ok: boolean
        result?: T
        description?: string
      }
    } catch (err) {
      return {
        ok: false,
        description: err instanceof Error ? err.message : "Erro de rede",
      }
    }
  }

  sendMessage(
    chatId: string | number,
    text: string,
    options?: {
      replyMarkup?: ReturnType<typeof buildInlineKeyboard>
      parseMode?: "HTML" | "Markdown" | "MarkdownV2"
    },
  ) {
    return this.callApi("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode ?? "HTML",
      reply_markup: options?.replyMarkup,
      disable_web_page_preview: true,
    })
  }

  sendPhoto(
    chatId: string | number,
    photoUrl: string,
    caption?: string,
    replyMarkup?: ReturnType<typeof buildInlineKeyboard>,
  ) {
    return this.callApi("sendPhoto", {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    })
  }

  sendDocument(chatId: string | number, documentUrl: string, caption?: string) {
    return this.callApi("sendDocument", {
      chat_id: chatId,
      document: documentUrl,
      caption,
      parse_mode: "HTML",
    })
  }

  answerCallbackQuery(callbackQueryId: string, text?: string) {
    return this.callApi("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
    })
  }

  editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    replyMarkup?: ReturnType<typeof buildInlineKeyboard>,
  ) {
    return this.callApi("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    })
  }

  setWebhook(url: string, secretToken?: string) {
    // Telegram echoes secret_token back in the X-Telegram-Bot-Api-Secret-Token
    // header on every update, letting us authenticate inbound webhooks.
    // `drop_pending_updates` clears any queue accumulated while disconnected.
    return this.callApi("setWebhook", {
      url,
      secret_token: secretToken,
      drop_pending_updates: true,
    })
  }
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
