"use client"

import { useRef, useState } from "react"
import { Loader2, Paperclip, X } from "lucide-react"
import { useMediaUpload } from "@/components/media/use-media-upload"
import type { MediaItem } from "@/components/media/media-thumb"

/**
 * Simple direct-upload attachment control.
 * Opens the device file picker, uploads straight to /api/tg/upload,
 * and shows the filename with a remove button. No gallery, no preview.
 */
export function MediaAttachment({
  items,
  onAdd,
  onRemove,
  cdnReady,
}: {
  items: MediaItem[]
  onAdd: (m: MediaItem) => void
  onRemove: (id: number) => void
  cdnReady: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const { tasks, upload } = useMediaUpload((m) => {
    onAdd(m)
  })

  const isUploading = tasks.some((t) => t.status === "uploading")
  const error = tasks.find((t) => t.status === "error")

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return
    setUploading(true)
    upload(Array.from(e.target.files), null)
      .catch((err) => {
        console.error("[media-picker] upload failed:", err)
      })
      .finally(() => {
        setUploading(false)
        e.target.value = ""
      })
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* File input (hidden) */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,application/*"
        hidden
        onChange={handleSelect}
      />

      {/* Attached items — filename + remove */}
      {items.length > 0 && (
        <div className="flex flex-col gap-1">
          {items.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-xl border border-dashboard-border/25 bg-dashboard-surface/55 px-3 py-2"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-dashboard-accent" />
              <span className="truncate text-xs text-dashboard-text">
                {m.fileName ?? m.type}
              </span>
              <button
                type="button"
                onClick={() => onRemove(m.id)}
                className="ml-auto shrink-0 text-dashboard-text-muted transition-colors hover:text-destructive"
                aria-label="Remover mídia"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button or upload in progress */}
      {uploading || isUploading ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashboard-accent/25 bg-dashboard-accent/5 px-3 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-dashboard-accent" />
          <span className="text-xs text-dashboard-text-muted">
            Enviando mídia...
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!cdnReady}
          className="flex items-center gap-2 rounded-xl border border-dashed border-dashboard-border/30 bg-dashboard-surface/40 px-3 py-2 text-xs font-bold text-dashboard-text-muted transition-colors hover:border-dashboard-accent/40 hover:bg-dashboard-accent/5 hover:text-dashboard-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Anexar mídia
        </button>
      )}

      {/* Error message */}
      {error && (
        <p className="text-[10px] text-destructive">{error.error}</p>
      )}
    </div>
  )
}
