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
    // We use a direct fetch because getMe doesn't return the photo, 
    // and we need getUserProfilePhotos
    const photosRes = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${bot.id}&limit=1`)
    const photosJson = await photosRes.json()

    if (photosJson.ok && photosJson.result?.photos?.length > 0) {
      const photoArray = photosJson.result.photos[0]
      const largestPhoto = photoArray[photoArray.length - 1]
      
      // 3. Get the file path to construct the download URL
      // Note: This URL contains the token, so in a real production app we might 
      // want to proxy this, but for a private admin panel it's often acceptable
      // to use the direct file path if we trust the admin.
      const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${largestPhoto.file_id}`)
      const fileJson = await fileRes.json()
      
      if (fileJson.ok && fileJson.result?.file_path) {
        photoUrl = `https://api.telegram.org/file/bot${token}/${fileJson.result.file_path}`
      }
    }

    return {
      name: bot.first_name,
      username: bot.username || "",
      photoUrl
    }
  } catch (err) {
    console.error("Error fetching bot preview:", err)
    return null
  }
}
