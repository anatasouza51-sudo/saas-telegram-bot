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
      .catch(() => {})
      .finally(() => {
        setUploading(false)
        e.target.value = ""
      })
  }

  return (
    <div className="flex flex-col gap-2">
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
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs text-foreground">
                {m.fileName ?? m.type}
              </span>
              <button
                type="button"
                onClick={() => onRemove(m.id)}
                className="ml-auto shrink-0 text-muted-foreground hover:text-destructive transition-colors"
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
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            Enviando mídia...
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!cdnReady}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/40 hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
