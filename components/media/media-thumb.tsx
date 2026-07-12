"use client"

import { FileText, Music, Film, Sticker as StickerIcon, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type MediaItem = {
  id: number
  fileId: string
  fileUniqueId: string | null
  type: string
  fileName: string | null
  mimeType: string | null
  fileSize: number | null
  width: number | null
  height: number | null
  duration: number | null
  thumbFileId: string | null
  usageCount: number
  folderId: number | null
  createdAt: string | Date
  uploadedByName?: string | null
}

// Types Telegram can render as an image preview through our proxy.
const PREVIEWABLE = new Set(["photo", "video", "animation"])

export function MediaThumb({
  media,
  className,
}: {
  media: Pick<MediaItem, "id" | "type" | "thumbFileId">
  className?: string
}) {
  const canPreview = PREVIEWABLE.has(media.type) || Boolean(media.thumbFileId)

  if (canPreview) {
    return (
      // Same-origin, session-guarded proxy — never the raw Telegram URL.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/tg/media/${media.id}`}
        alt=""
        className={cn("h-full w-full object-cover", className)}
        loading="lazy"
      />
    )
  }

  const Icon =
    media.type === "audio"
      ? Music
      : media.type === "video"
        ? Film
        : media.type === "sticker"
          ? StickerIcon
          : media.type === "document"
            ? FileText
            : ImageIcon

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-8 w-8" />
    </div>
  )
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "—"
  const units = ["B", "KB", "MB", "GB"]
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}
