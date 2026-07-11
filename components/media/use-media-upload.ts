"use client"

import { useState, useCallback } from "react"
import type { MediaItem } from "@/components/media/media-thumb"

export type UploadTask = {
  id: string
  name: string
  progress: number
  status: "uploading" | "done" | "error"
  error?: string
}

// Uploads files to /api/tg/upload one at a time, exposing per-file progress.
// Uses XMLHttpRequest because fetch() has no upload progress events.
export function useMediaUpload(onUploaded: (m: MediaItem) => void) {
  const [tasks, setTasks] = useState<UploadTask[]>([])

  const update = useCallback((id: string, patch: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const clearDone = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status !== "done"))
  }, [])

  const uploadOne = useCallback(
    (file: File, folderId: number | null, asDocument: boolean) =>
      new Promise<void>((resolve) => {
        const id = `${file.name}-${Date.now()}-${Math.random()}`
        setTasks((prev) => [
          ...prev,
          { id, name: file.name, progress: 0, status: "uploading" },
        ])

        const form = new FormData()
        form.append("file", file)
        if (folderId != null) form.append("folderId", String(folderId))
        if (asDocument) form.append("asDocument", "true")

        const xhr = new XMLHttpRequest()
        xhr.open("POST", "/api/tg/upload")
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            update(id, { progress: Math.round((e.loaded / e.total) * 100) })
          }
        }
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText)
            if (xhr.status >= 200 && xhr.status < 300 && json.media) {
              update(id, { progress: 100, status: "done" })
              onUploaded(json.media as MediaItem)
            } else {
              update(id, { status: "error", error: json.error ?? "Falha" })
            }
          } catch {
            update(id, { status: "error", error: "Resposta inválida" })
          }
          resolve()
        }
        xhr.onerror = () => {
          update(id, { status: "error", error: "Erro de rede" })
          resolve()
        }
        xhr.send(form)
      }),
    [onUploaded, update],
  )

  const upload = useCallback(
    async (files: FileList | File[], folderId: number | null, asDocument = false) => {
      const arr = Array.from(files)
      // Sequential to respect Telegram rate limits and keep progress readable.
      for (const file of arr) {
        await uploadOne(file, folderId, asDocument)
      }
    },
    [uploadOne],
  )

  return { tasks, upload, clearDone }
}
