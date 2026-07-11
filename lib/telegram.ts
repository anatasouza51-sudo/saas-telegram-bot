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
    return this.callApi<TelegramMessage>("sendMessage", {
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

  /* --- Identity & chat validation ------------------------------------- */

  getMe() {
    return this.callApi<TelegramUser>("getMe", {})
  }

  getChat(chatId: string | number) {
    return this.callApi<TelegramChatInfo>("getChat", { chat_id: chatId })
  }

  getChatMember(chatId: string | number, userId: number) {
    return this.callApi<TelegramChatMember>("getChatMember", {
      chat_id: chatId,
      user_id: userId,
    })
  }

  /* --- File download (server-side only) ------------------------------- */

  // Resolves a file_id to Telegram's temporary download URL. This URL embeds
  // the bot token, so it must NEVER be sent to the browser — only used by our
  // server-side proxy to stream bytes back to authenticated admins.
  async getFileUrl(fileId: string): Promise<string | null> {
    const res = await this.callApi<{ file_path?: string }>("getFile", {
      file_id: fileId,
    })
    if (!res.ok || !res.result?.file_path) return null
    return `https://api.telegram.org/file/bot${this.token}/${res.result.file_path}`
  }

  /* --- Sending by file_id (reuses Telegram-hosted media) -------------- */

  sendMediaByFileId(
    chatId: string | number,
    kind: TelegramMediaKind,
    fileId: string,
    options?: {
      caption?: string
      replyMarkup?: ReturnType<typeof buildInlineKeyboard>
      parseMode?: "HTML" | "Markdown" | "MarkdownV2"
    },
  ) {
    const method = SEND_METHOD[kind]
    const field = MEDIA_FIELD[kind]
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      [field]: fileId,
      reply_markup: options?.replyMarkup,
    }
    // Stickers don't support captions.
    if (kind !== "sticker") {
      payload.caption = options?.caption
      payload.parse_mode = options?.parseMode ?? "HTML"
    }
    return this.callApi<TelegramMessage>(method, payload)
  }

  sendMediaGroup(
    chatId: string | number,
    items: { kind: "photo" | "video"; fileId: string; caption?: string }[],
    parseMode: "HTML" | "Markdown" = "HTML",
  ) {
    const media = items.map((it, i) => ({
      type: it.kind,
      media: it.fileId,
      // Caption only on the first item so it shows under the album.
      caption: i === 0 ? it.caption : undefined,
      parse_mode: parseMode,
    }))
    return this.callApi<TelegramMessage[]>("sendMediaGroup", {
      chat_id: chatId,
      media,
    })
  }

  /* --- Multipart upload to the CDN chat ------------------------------- */

  // Uploads a raw file to the given (private CDN) chat. Telegram stores the
  // bytes and returns a reusable file_id we persist. No public URL involved.
  async uploadMedia(
    chatId: string | number,
    kind: TelegramMediaKind,
    file: { data: Buffer | Uint8Array; filename: string; mimeType?: string },
  ): Promise<{
    ok: boolean
    description?: string
    media?: NormalizedMedia
  }> {
    if (!this.token) return { ok: false, description: "Token não configurado" }
    const method = SEND_METHOD[kind]
    const field = MEDIA_FIELD[kind]
    try {
      const form = new FormData()
      form.append("chat_id", String(chatId))
      const blob = new Blob([file.data as BlobPart], {
        type: file.mimeType || "application/octet-stream",
      })
      form.append(field, blob, file.filename)
      const res = await fetch(`${API_BASE}${this.token}/${method}`, {
        method: "POST",
        body: form,
      })
      const json = (await res.json()) as {
        ok: boolean
        result?: TelegramMessage
        description?: string
      }
      if (!json.ok || !json.result) {
        return { ok: false, description: json.description ?? "Falha no upload" }
      }
      const media = extractMedia(json.result, kind, file)
      if (!media) return { ok: false, description: "Mídia não reconhecida" }
      return { ok: true, media }
    } catch (err) {
      return {
        ok: false,
        description: err instanceof Error ? err.message : "Erro de rede",
      }
    }
  }
}

/* --- Media helpers ---------------------------------------------------- */

export type TelegramMediaKind =
  | "photo"
  | "video"
  | "animation"
  | "document"
  | "audio"
  | "sticker"

const SEND_METHOD: Record<TelegramMediaKind, string> = {
  photo: "sendPhoto",
  video: "sendVideo",
  animation: "sendAnimation",
  document: "sendDocument",
  audio: "sendAudio",
  sticker: "sendSticker",
}

const MEDIA_FIELD: Record<TelegramMediaKind, string> = {
  photo: "photo",
  video: "video",
  animation: "animation",
  document: "document",
  audio: "audio",
  sticker: "sticker",
}

export type NormalizedMedia = {
  fileId: string
  fileUniqueId: string
  type: TelegramMediaKind
  fileName?: string
  mimeType?: string
  fileSize?: number
  width?: number
  height?: number
  duration?: number
  thumbFileId?: string
}

// Pulls the file_id + metadata out of a sent Message, per media kind.
function extractMedia(
  msg: TelegramMessage,
  kind: TelegramMediaKind,
  file: { filename: string; mimeType?: string },
): NormalizedMedia | null {
  if (kind === "photo" && msg.photo?.length) {
    const largest = msg.photo[msg.photo.length - 1]
    return {
      fileId: largest.file_id,
      fileUniqueId: largest.file_unique_id,
      type: "photo",
      fileName: file.filename,
      mimeType: file.mimeType,
      fileSize: largest.file_size,
      width: largest.width,
      height: largest.height,
    }
  }
  const obj =
    kind === "video"
      ? msg.video
      : kind === "animation"
        ? msg.animation
        : kind === "document"
          ? msg.document
          : kind === "audio"
            ? msg.audio
            : kind === "sticker"
              ? msg.sticker
              : undefined
  if (!obj) return null
  return {
    fileId: obj.file_id,
    fileUniqueId: obj.file_unique_id,
    type: kind,
    fileName: obj.file_name ?? file.filename,
    mimeType: obj.mime_type ?? file.mimeType,
    fileSize: obj.file_size,
    width: obj.width,
    height: obj.height,
    duration: obj.duration,
    thumbFileId: obj.thumb?.file_id,
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

export type TelegramUser = {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
}

export type TelegramChatInfo = {
  id: number
  type: "private" | "group" | "supergroup" | "channel"
  title?: string
  username?: string
  description?: string
}

export type TelegramChatMember = {
  status:
    | "creator"
    | "administrator"
    | "member"
    | "restricted"
    | "left"
    | "kicked"
  can_post_messages?: boolean
  can_edit_messages?: boolean
  can_delete_messages?: boolean
  can_manage_chat?: boolean
}

type TelegramFileObject = {
  file_id: string
  file_unique_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
  width?: number
  height?: number
  duration?: number
  thumb?: { file_id: string; file_unique_id: string }
}

export type TelegramMessage = {
  message_id: number
  chat: { id: number }
  photo?: Array<{
    file_id: string
    file_unique_id: string
    width: number
    height: number
    file_size?: number
  }>
  video?: TelegramFileObject
  animation?: TelegramFileObject
  document?: TelegramFileObject
  audio?: TelegramFileObject
  sticker?: TelegramFileObject
}
