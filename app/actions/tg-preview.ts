"use server"

import { requireCapability } from "@/lib/session"
import { TelegramClient } from "@/lib/telegram"
import { validateBotToken } from "@/lib/validation"

export type BotPreview = {
  name: string
  username: string
  photoUrl: string | null
}

/**
 * Fetches bot information and its profile photo securely on the server side.
 * Corrigido (A-1): Removido o "use client" e validação rigorosa de permissão.
 * O token não é mais exposto no navegador do usuário.
 */
export async function getBotPreview(tokenInput: string): Promise<BotPreview | null> {
  // Exige permissão de gerenciamento do Telegram no servidor
  await requireCapability("telegram.manage")

  let token: string
  try {
    token = validateBotToken(tokenInput)
  } catch {
    return null
  }

  if (!token || !token.includes(":")) return null

  try {
    const client = new TelegramClient(token)
    
    // 1. Get basic bot info
    const meRes = await client.getMe()
    if (!meRes.ok || !meRes.result) return null

    const bot = meRes.result
    let photoUrl: string | null = null

    // 2. Get bot profile photos via server-side fetch
    const photosRes = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${bot.id}&limit=1`, {
      signal: AbortSignal.timeout(10_000),
    })
    const photosJson = await photosRes.json().catch(() => ({}))

    if (photosJson.ok && photosJson.result?.photos?.length > 0) {
      const photoArray = photosJson.result.photos[0]
      const largestPhoto = photoArray[photoArray.length - 1]
      
      // 3. Get the file path
      const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${largestPhoto.file_id}`, {
        signal: AbortSignal.timeout(10_000),
      })
      const fileJson = await fileRes.json().catch(() => ({}))
      
      if (fileJson.ok && fileJson.result?.file_path) {
        const rawTelegramUrl = `https://api.telegram.org/file/bot${token}/${fileJson.result.file_path}`
        photoUrl = `/api/tg/bot-avatar?url=${encodeURIComponent(rawTelegramUrl)}`
      }
    }

    return {
      name: bot.first_name,
      username: bot.username || "",
      photoUrl
    }
  } catch (err) {
    console.error("Error fetching bot preview (token redacted)")
    return null
  }
}
