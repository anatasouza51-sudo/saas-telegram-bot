"use server"

import { TelegramClient } from "@/lib/telegram"
import { requireCapability } from "@/lib/session"

export type BotPreview = {
  name: string
  username: string
  photoUrl: string | null
}

// Profile photos are tiny; cap the inlined payload defensively.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

/**
 * Fetches bot information and its profile photo using the provided token.
 * Used for real-time preview in the settings panel.
 *
 * Runs server-side only: the bot token is never sent from the browser to the
 * Telegram API, and the returned photo is inlined as a data URL so no
 * token-bearing file URL reaches the client.
 */
export async function getBotPreview(token: string): Promise<BotPreview | null> {
  await requireCapability("telegram.manage")

  if (!token || !token.includes(":")) return null

  try {
    const client = new TelegramClient(token)

    const meRes = await client.getMe()
    if (!meRes.ok || !meRes.result) return null

    const bot = meRes.result
    let photoUrl: string | null = null

    const photosRes = await fetch(
      `https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${bot.id}&limit=1`,
    )
    const photosJson = await photosRes.json()

    if (photosJson.ok && photosJson.result?.photos?.length > 0) {
      const photoArray = photosJson.result.photos[0]
      const largestPhoto = photoArray[photoArray.length - 1]

      const fileRes = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${largestPhoto.file_id}`,
      )
      const fileJson = await fileRes.json()

      if (fileJson.ok && fileJson.result?.file_path) {
        const download = await fetch(
          `https://api.telegram.org/file/bot${token}/${fileJson.result.file_path}`,
        )
        if (download.ok) {
          const bytes = Buffer.from(await download.arrayBuffer())
          if (bytes.byteLength <= MAX_PHOTO_BYTES) {
            const mime = download.headers.get("content-type") ?? "image/jpeg"
            photoUrl = `data:${mime};base64,${bytes.toString("base64")}`
          }
        }
      }
    }

    return {
      name: bot.first_name,
      username: bot.username || "",
      photoUrl,
    }
  } catch (err) {
    console.error("Error fetching bot preview:", err)
    return null
  }
}
