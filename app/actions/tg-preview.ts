"use client"

import { TelegramClient } from "@/lib/telegram"

export type BotPreview = {
  name: string
  username: string
  photoUrl: string | null
}

/**
 * Fetches bot information and its profile photo using the provided token.
 * This is used for real-time preview in the settings panel.
 */
export async function getBotPreview(token: string): Promise<BotPreview | null> {
  if (!token || !token.includes(":")) return null

  try {
    const client = new TelegramClient(token)
    
    // 1. Get basic bot info
    const meRes = await client.getMe()
    if (!meRes.ok || !meRes.result) return null

    const bot = meRes.result
    let photoUrl: string | null = null

    // 2. Get bot profile photos
    const photosRes = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${bot.id}&limit=1`)
    const photosJson = await photosRes.json()

    if (photosJson.ok && photosJson.result?.photos?.length > 0) {
      const photoArray = photosJson.result.photos[0]
      const largestPhoto = photoArray[photoArray.length - 1]
      
      // 3. Get the file path
      const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${largestPhoto.file_id}`)
      const fileJson = await fileRes.json()
      
      if (fileJson.ok && fileJson.result?.file_path) {
        // SEGURANÇA: Não retornamos a URL do Telegram diretamente pois ela contém o token.
        // Em vez disso, retornamos uma URL de proxy do nosso próprio servidor.
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
    // SEGURANÇA: Não logamos o token em caso de erro
    console.error("Error fetching bot preview (token redacted)")
    return null
  }
}
