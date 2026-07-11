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
 * Returns the primary message_id on success.
 */
export async function sendPost(
  client: TelegramClient,
  chatId: string | number,
  post: RenderablePost,
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const keyboard = toInlineKeyboard(post.buttons)
  const text = post.text ?? ""

  // No media: a plain (optionally keyboarded) message.
  if (post.media.length === 0) {
    const res = await client.sendMessage(chatId, text, {
      replyMarkup: keyboard,
      parseMode: post.parseMode,
    })
    return normalize(res)
  }

  // Single media: caption + keyboard ride along on the media message.
  if (post.media.length === 1) {
    const m = post.media[0]
    const res = await client.sendMediaByFileId(chatId, m.type, m.fileId, {
      caption: text || undefined,
      replyMarkup: keyboard,
      parseMode: post.parseMode,
    })
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
    )
    const first = Array.isArray(res.result) ? res.result[0] : undefined
    // Albums can't carry buttons; send them as a follow-up if present.
    if (res.ok && keyboard) {
      await client.sendMessage(chatId, text || "⬆️", {
        replyMarkup: keyboard,
        parseMode: post.parseMode,
      })
    }
    return res.ok
      ? { ok: true, messageId: first?.message_id }
      : { ok: false, error: res.description }
  }

  // Fallback: send each media sequentially with the caption on the first.
  let firstId: number | undefined
  for (let i = 0; i < post.media.length; i++) {
    const m = post.media[i]
    const res = await client.sendMediaByFileId(chatId, m.type, m.fileId, {
      caption: i === 0 ? text || undefined : undefined,
      replyMarkup: i === post.media.length - 1 ? keyboard : undefined,
      parseMode: post.parseMode,
    })
    if (!res.ok) return { ok: false, error: res.description }
    if (i === 0) firstId = res.result?.message_id
  }
  return { ok: true, messageId: firstId }
}

function normalize(res: {
  ok: boolean
  result?: { message_id: number }
  description?: string
}) {
  return res.ok
    ? { ok: true, messageId: res.result?.message_id }
    : { ok: false, error: res.description }
}
