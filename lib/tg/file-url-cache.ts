import "server-only"
import { TelegramClient } from "@/lib/telegram"

/**
 * Best-effort in-memory cache for Telegram `getFile` URLs.
 *
 * Why: Telegram's `getFile` endpoint returns a download URL that embeds the
 * bot token and stays valid for ~1 hour. Calling `getFile` on every single
 * media preview wastes API quota and risks rate-limiting. By caching the
 * resolved URL for ~50 minutes we avoid redundant calls while staying safely
 * within the URL's validity window.
 *
 * Note: state lives in the process, so in a multi-instance/serverless
 * deployment each instance keeps its own cache. This is still effective
 * because the URL resolves per store (same token → same URL), and repeated
 * requests to the same instance benefit from the hit. For strict distributed
 * caching, swap this module with a Redis-backed version — the call sites
 * won't change.
 */

const TTL_MS = 50 * 60 * 1000 // 50 minutes

type CacheEntry = {
  url: string
  expiresAt: number // absolute timestamp
}

const cache = new Map<string, CacheEntry>()

// Sweep expired entries every 10 minutes to keep memory bounded.
setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of cache) {
      if (now >= entry.expiresAt) cache.delete(key)
    }
  },
  10 * 60 * 1000,
)

/**
 * Returns the Telegram download URL for a given file_id, using the cache
 * when available and calling `getFile` otherwise.
 *
 * The cache key is the file_id itself — since the bot token is fixed per
 * store, the same file_id always maps to the same download URL.
 */
export async function getFileUrl(
  client: TelegramClient,
  fileId: string,
): Promise<string | null> {
  const cached = cache.get(fileId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url
  }

  const url = await client.getFileUrl(fileId)
  if (!url) return null

  cache.set(fileId, {
    url,
    expiresAt: Date.now() + TTL_MS,
  })
  return url
}

/** Removes a specific file_id from the cache (e.g. after a media deletion). */
export function invalidateFileUrl(fileId: string): void {
  cache.delete(fileId)
}

/** Clears the entire cache (useful for testing or admin resets). */
export function clearFileUrlCache(): void {
  cache.clear()
}
