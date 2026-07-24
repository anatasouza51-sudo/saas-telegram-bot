import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { buildInlineKeyboard, TelegramClient } from "@/lib/telegram"

const TOKEN = "123456:AAaa-bb"
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(json({ ok: true, result: {} }))
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
  const body = typeof init.body === "string" ? JSON.parse(init.body) : null
  return { url: String(url), init, body }
}

describe("buildInlineKeyboard", () => {
  it("wraps rows in Telegram's inline_keyboard envelope", () => {
    const rows = [[{ text: "Ok", callback_data: "ok" }]]
    expect(buildInlineKeyboard(rows)).toEqual({ inline_keyboard: rows })
  })
})

describe("TelegramClient.botId", () => {
  it("derives the bot id from the token prefix", () => {
    expect(new TelegramClient(TOKEN).botId).toBe(123456)
  })

  it("returns null for malformed tokens", () => {
    expect(new TelegramClient("abc:def").botId).toBeNull()
    expect(new TelegramClient("").botId).toBeNull()
    expect(new TelegramClient("-1:x").botId).toBeNull()
  })
})

describe("TelegramClient API calls", () => {
  const client = () => new TelegramClient(TOKEN)

  it("posts to the token-scoped endpoint with HTML parse mode by default", async () => {
    await client().sendMessage("-100123", "Olá")
    const { url, body, init } = lastCall()
    expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`)
    expect(init.method).toBe("POST")
    expect(body).toEqual({
      chat_id: "-100123",
      text: "Olá",
      parse_mode: "HTML",
      disable_web_page_preview: true,
    })
  })

  it("honors an explicit parse mode and reply markup", async () => {
    const markup = buildInlineKeyboard([[{ text: "Ok", callback_data: "ok" }]])
    await client().sendMessage(42, "*oi*", { parseMode: "MarkdownV2", replyMarkup: markup })
    const { body } = lastCall()
    expect(body.parse_mode).toBe("MarkdownV2")
    expect(body.reply_markup).toEqual(markup)
  })

  it("refuses to call the API without a token", async () => {
    const res = await new TelegramClient("").sendMessage(1, "hi")
    expect(res).toEqual({ ok: false, description: "Token do bot não configurado" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("turns network errors into a failed result", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"))
    expect(await client().sendMessage(1, "hi")).toEqual({
      ok: false,
      description: "offline",
    })
  })

  it("returns the API payload as-is", async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: false, description: "chat not found" }))
    expect(await client().deleteMessage(1, 2)).toEqual({
      ok: false,
      description: "chat not found",
    })
  })

  it("subscribes to the member updates needed for chat auto-detection", async () => {
    await client().setWebhook("https://app.example.com/hook", "s3cret")
    const { body } = lastCall()
    expect(body.secret_token).toBe("s3cret")
    expect(body.drop_pending_updates).toBe(true)
    expect(body.allowed_updates).toContain("my_chat_member")
    expect(body.allowed_updates).toContain("chat_member")
  })

  it("sends media by file_id with a caption, except for stickers", async () => {
    await client().sendMediaByFileId("-1", "video", "file-1", { caption: "Legenda" })
    expect(lastCall().url).toContain("/sendVideo")
    expect(lastCall().body).toMatchObject({
      chat_id: "-1",
      video: "file-1",
      caption: "Legenda",
      parse_mode: "HTML",
    })

    await client().sendMediaByFileId("-1", "sticker", "file-2", { caption: "Legenda" })
    expect(lastCall().url).toContain("/sendSticker")
    expect(lastCall().body).not.toHaveProperty("caption")
  })

  it("captions only the first item of a media group", async () => {
    await client().sendMediaGroup("-1", [
      { kind: "photo", fileId: "a", caption: "Álbum" },
      { kind: "photo", fileId: "b", caption: "Ignorada" },
    ])
    const { body } = lastCall()
    expect(body.media[0]).toEqual({
      type: "photo",
      media: "a",
      caption: "Álbum",
      parse_mode: "HTML",
    })
    expect(body.media[1].caption).toBeUndefined()
  })

  it("resolves a file_id into a token-scoped download URL", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ ok: true, result: { file_path: "photos/1.jpg" } }),
    )
    expect(await client().getFileUrl("file-1")).toBe(
      `https://api.telegram.org/file/bot${TOKEN}/photos/1.jpg`,
    )
  })

  it("returns null when the file cannot be resolved", async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: false, description: "not found" }))
    expect(await client().getFileUrl("file-1")).toBeNull()
    fetchMock.mockResolvedValueOnce(json({ ok: true, result: {} }))
    expect(await client().getFileUrl("file-1")).toBeNull()
  })
})

describe("TelegramClient.uploadMedia", () => {
  const file = { data: Buffer.from("bytes"), filename: "foto.jpg", mimeType: "image/jpeg" }

  it("uploads multipart and normalizes the largest photo size", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        ok: true,
        result: {
          photo: [
            { file_id: "small", file_unique_id: "u1", width: 90, height: 90, file_size: 100 },
            { file_id: "large", file_unique_id: "u2", width: 800, height: 600, file_size: 900 },
          ],
        },
      }),
    )
    const res = await new TelegramClient(TOKEN).uploadMedia("-1", "photo", file)
    expect(lastCall().url).toContain("/sendPhoto")
    expect(lastCall().init.body).toBeInstanceOf(FormData)
    expect(res).toEqual({
      ok: true,
      media: {
        fileId: "large",
        fileUniqueId: "u2",
        type: "photo",
        fileName: "foto.jpg",
        mimeType: "image/jpeg",
        fileSize: 900,
        width: 800,
        height: 600,
      },
    })
  })

  it("normalizes non-photo media, preferring Telegram's own metadata", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        ok: true,
        result: {
          video: {
            file_id: "v1",
            file_unique_id: "u3",
            file_name: "clip.mp4",
            mime_type: "video/mp4",
            duration: 12,
            thumb: { file_id: "thumb-1" },
          },
        },
      }),
    )
    const res = await new TelegramClient(TOKEN).uploadMedia("-1", "video", {
      data: Buffer.from("x"),
      filename: "upload.bin",
    })
    expect(res.media).toMatchObject({
      fileId: "v1",
      type: "video",
      fileName: "clip.mp4",
      mimeType: "video/mp4",
      duration: 12,
      thumbFileId: "thumb-1",
    })
  })

  it("reports upload failures, unrecognized media and missing tokens", async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: false, description: "too big" }))
    expect(await new TelegramClient(TOKEN).uploadMedia("-1", "photo", file)).toEqual({
      ok: false,
      description: "too big",
    })

    fetchMock.mockResolvedValueOnce(json({ ok: true, result: {} }))
    expect(await new TelegramClient(TOKEN).uploadMedia("-1", "photo", file)).toEqual({
      ok: false,
      description: "Mídia não reconhecida",
    })

    expect(await new TelegramClient("").uploadMedia("-1", "photo", file)).toEqual({
      ok: false,
      description: "Token não configurado",
    })
  })
})

describe("TelegramClient.sendPhotoBytes", () => {
  it("sends the QR bytes as multipart with caption and keyboard", async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true, result: { message_id: 7 } }))
    const res = await new TelegramClient(TOKEN).sendPhotoBytes("-1", Buffer.from("png"), {
      caption: "PIX",
      replyMarkup: buildInlineKeyboard([[{ text: "Copiar", callback_data: "copy" }]]),
      filename: "qr.png",
    })
    const form = lastCall().init.body as FormData
    expect(form.get("chat_id")).toBe("-1")
    expect(form.get("caption")).toBe("PIX")
    expect(form.get("parse_mode")).toBe("HTML")
    expect(JSON.parse(String(form.get("reply_markup")))).toEqual({
      inline_keyboard: [[{ text: "Copiar", callback_data: "copy" }]],
    })
    expect(res.result).toEqual({ message_id: 7 })
  })

  it("fails without a token and on network errors", async () => {
    expect(await new TelegramClient("").sendPhotoBytes("-1", Buffer.from("x"))).toEqual({
      ok: false,
      description: "Token não configurado",
    })
    fetchMock.mockRejectedValueOnce(new Error("timeout"))
    expect(await new TelegramClient(TOKEN).sendPhotoBytes("-1", Buffer.from("x"))).toEqual({
      ok: false,
      description: "timeout",
    })
  })
})
