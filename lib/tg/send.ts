import "server-only"
import type { TelegramClient, TelegramMediaKind } from "@/lib/telegram"
import { toInlineKeyboard, type ButtonRows } from "@/lib/tg/buttons"

export type ResolvedMedia = {
  fileId: string
  type: TelegramMediaKind
}

export type RenderablePost = {
  text: string
  parseMode: "HTML" | "Markdown"
  media: ResolvedMedia[]
  buttons: ButtonRows
}

/**
 * Sends a composed post to a single chat, choosing the right Telegram method:
 * - text only -> sendMessage
 * - single media -> sendX with caption + buttons
 * - multiple media -> sendMediaGroup album (+ a follow-up message for buttons,
 *   since albums cannot carry an inline keyboard)
 *
 * When `messageThreadId` is given the post lands inside that forum topic
 * instead of the group's general area.
 *
 * Returns the primary message_id on success.
 */
export async function sendPost(
  client: TelegramClient,
  chatId: string | number,
  post: RenderablePost,
  messageThreadId?: number | null,
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const keyboard = toInlineKeyboard(post.buttons)
  const text = post.text ?? ""

  // No media: a plain (optionally keyboarded) message.
  if (post.media.length === 0) {
    const chunks = splitText(text, TELEGRAM_TEXT_LIMIT)
    if (chunks.length === 0) {
      return { ok: false, error: "Mensagem vazia" }
    }
    // Buttons go on the LAST chunk so they stay attached to the post.
    let firstId: number | undefined
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1
      const res = await client.sendMessage(chatId, chunks[i], {
        replyMarkup: isLast ? keyboard : undefined,
        parseMode: post.parseMode,
        messageThreadId,
      })
      if (!res.ok) return normalize(res)
      if (i === 0) firstId = res.result?.message_id
    }
    return { ok: true, messageId: firstId }
  }

  // Single media: caption + keyboard ride along on the media message.
  // Caption is capped at 1 024 chars; longer texts are sent as split
  // follow-up messages before the keyboarded caption.
  if (post.media.length === 1) {
    const m = post.media[0]
    const res = await client.sendMediaByFileId(chatId, m.type, m.fileId, {
      caption: text.length > 1_024 ? undefined : text || undefined,
      replyMarkup: keyboard,
      parseMode: post.parseMode,
      messageThreadId,
    })
    if (!res.ok) return normalize(res)
    if (text.length > 1_024) {
      const chunks = splitText(text, TELEGRAM_TEXT_LIMIT)
      for (const chunk of chunks) {
        const follow = await client.sendMessage(chatId, chunk, {
          parseMode: post.parseMode,
          messageThreadId,
        })
        if (!follow.ok) return normalize(follow)
      }
    }
    return normalize(res)
  }

  // Multiple media: only photos/videos can be grouped into an album.
  const groupable = post.media.filter(
    (m) => m.type === "photo" || m.type === "video",
  ) as { fileId: string; type: "photo" | "video" }[]

  if (groupable.length >= 2) {
    const res = await client.sendMediaGroup(
      chatId,
      groupable.map((m, i) => ({
        kind: m.type,
        fileId: m.fileId,
        caption: i === 0 ? text || undefined : undefined,
      })),
      post.parseMode,
      messageThreadId,
    )
    const first = Array.isArray(res.result) ? res.result[0] : undefined
    // Albums can't carry buttons; send them as a follow-up if present.
    // Caption is capped at 1 024 chars by Telegram for albums, so long texts
    // are appended as split follow-up messages before the keyboard.
    if (res.ok && (text || keyboard)) {
      const effectiveCaption = text.length > 1_024 ? "" : text
      const followUpText = text.length > 1_024 ? text : ""
      if (followUpText) {
        const chunks = splitText(followUpText, TELEGRAM_TEXT_LIMIT)
        for (const chunk of chunks) {
          const follow = await client.sendMessage(chatId, chunk, {
            parseMode: post.parseMode,
            messageThreadId,
          })
          if (!follow.ok) {
            return {
              ok: false,
              error: formatTelegramError(follow.description),
            }
          }
        }
      }
      if (keyboard) {
        await client.sendMessage(chatId, effectiveCaption || "⬆️", {
          replyMarkup: keyboard,
          parseMode: post.parseMode,
          messageThreadId,
        })
      }
    }
    return res.ok
      ? { ok: true, messageId: first?.message_id }
      : { ok: false, error: formatTelegramError(res.description) }
  }

  // Fallback: send each media sequentially with the caption on the first.
  let firstId: number | undefined
  for (let i = 0; i < post.media.length; i++) {
    const m = post.media[i]
    const res = await client.sendMediaByFileId(chatId, m.type, m.fileId, {
      caption: i === 0 ? text || undefined : undefined,
      replyMarkup: i === post.media.length - 1 ? keyboard : undefined,
      parseMode: post.parseMode,
      messageThreadId,
    })
    if (!res.ok) return { ok: false, error: formatTelegramError(res.description) }
    if (i === 0) firstId = res.result?.message_id
  }
  return { ok: true, messageId: firstId }
}

// Telegram caps plain messages at 4 096 characters. Posts saved with up to
// 5 000 chars (user-requested editor cap) are auto-splitted into chunks sent
// as consecutive messages so the broadcast never fails with "message is too
// long". Buttons ride along on the final chunk (or the only one).
const TELEGRAM_TEXT_LIMIT = 4_096
function splitText(text: string, limit: number): string[] {
  if (text.length <= limit) return text ? [text] : []
  const chunks: string[] = []
  for (let start = 0; start < text.length; start += limit) {
    // Prefer splitting on a newline boundary near the limit to avoid cutting
    // a line mid-sentence; fall back to hard slice otherwise.
    let end = Math.min(start + limit, text.length)
    const isLast = end >= text.length
    if (!isLast) {
      const nl = text.lastIndexOf("\n", end)
      if (nl > start) end = nl
    }
    chunks.push(text.slice(start, end))
  }
  return chunks
}

function formatTelegramError(description?: string): string {
  if (!description) return "Erro desconhecido na API do Telegram"
  
  if (description.includes("bot was kicked")) {
    return "O bot foi removido do grupo ou canal."
  }
  if (description.includes("not enough rights")) {
    return "O bot não tem permissões suficientes para postar (precisa ser admin)."
  }
  if (description.includes("chat not found")) {
    return "O grupo ou canal não foi encontrado. Verifique se o bot ainda é membro."
  }
  if (description.includes("user is deactivated") || description.includes("bot is deactivated")) {
    return "O bot está desativado."
  }
  if (description.includes("message is too long")) {
    return "A mensagem é muito longa para o Telegram."
  }
  
  return `Telegram: ${description}`
}

function normalize(res: {
  ok: boolean
  result?: { message_id: number }
  description?: string
}) {
  return res.ok
    ? { ok: true, messageId: res.result?.message_id }
    : { ok: false, error: formatTelegramError(res.description) }
}
