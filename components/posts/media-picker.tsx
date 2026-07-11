"use client"

import { useEffect, useState, useTransition } from "react"
import { Check, Loader2, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MediaThumb, formatBytes, type MediaItem } from "@/components/media/media-thumb"
import { listMedia } from "@/app/actions/tg-media"
import { useMediaUpload } from "@/components/media/use-media-upload"
import { useRef } from "react"

export function MediaPicker({
  open,
  onOpenChange,
  selectedIds,
  onConfirm,
  cdnReady,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  selectedIds: number[]
  onConfirm: (media: MediaItem[]) => void
  cdnReady: boolean
}) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [picked, setPicked] = useState<Map<number, MediaItem>>(new Map())
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    startTransition(async () => {
      const rows = (await listMedia({})) as unknown as MediaItem[]
      setMedia(rows)
      const init = new Map<number, MediaItem>()
      for (const r of rows) if (selectedIds.includes(r.id)) init.set(r.id, r)
      setPicked(init)
    })
  }, [open, selectedIds])

  const { tasks, upload } = useMediaUpload((m) => {
    setMedia((prev) => (prev.some((x) => x.id === m.id) ? prev : [m, ...prev]))
  })

  function toggle(m: MediaItem) {
    setPicked((prev) => {
      const next = new Map(prev)
      if (next.has(m.id)) next.delete(m.id)
      else next.set(m.id, m)
      return next
    })
  }

  function confirm() {
    // Preserve selection order for album rendering.
    onConfirm(Array.from(picked.values()))
    onOpenChange(false)
  }

  const uploading = tasks.some((t) => t.status === "uploading")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar mídias</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {picked.size} selecionada(s)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!cdnReady || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Enviar nova
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) upload(e.target.files, null)
              e.target.value = ""
            }}
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {isPending ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : media.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma mídia. Envie um arquivo para começar.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {media.map((m) => {
                const isPicked = picked.has(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m)}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-lg border-2 text-left transition-colors",
                      isPicked ? "border-primary" : "border-transparent hover:border-border",
                    )}
                  >
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <MediaThumb media={m} />
                      {isPicked && (
                        <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <span className="truncate p-1 text-[10px] text-muted-foreground">
                      {m.fileName ?? m.type} · {formatBytes(m.fileSize)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirm}>Confirmar ({picked.size})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
