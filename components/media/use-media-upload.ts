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
              // Server returned an error as JSON — show the real message.
              update(id, {
                status: "error",
                error: json.error ?? `Erro do servidor (status ${xhr.status})`,
              })
            }
          } catch (parseErr) {
            // The response is not valid JSON — likely an HTML error page.
            // Extract useful info from status and responseText.
            const status = xhr.status
            let msg = "Falha na comunicação com o servidor"
            if (status === 0) {
              msg = "Erro de rede — verifique sua conexão"
            } else if (status >= 500) {
              // Try to extract a message from the response text (might be HTML or plain text).
              const text = (xhr.responseText || "").trim()
              const match = text.match(/<title>(.*?)<\/title>/)
              if (match && match[1] && match[1] !== "500") {
                msg = `Erro do servidor (${status}): ${match[1]}`
              } else {
                msg = `Erro interno do servidor (${status}) — o arquivo pode ser muito grande ou o Telegram está indisponível.`
              }
            } else if (status === 413) {
              msg = "Arquivo muito grande — o limite é 50MB."
            } else if (status === 401) {
              msg = "Sessão expirada — faça login novamente."
            } else if (status === 403) {
              msg = "Sem permissão para enviar mídia."
            } else if (status === 400) {
              msg = text || "Requisição inválida — verifique o arquivo."
            } else {
              msg = `Erro inesperado (status ${status})`
            }
            console.error(
              "[media-upload] Non-JSON response:",
              { status, text: (xhr.responseText || "").slice(0, 200) },
            )
            update(id, { status: "error", error: msg })
          }
          resolve()
        }
        xhr.onerror = () => {
          update(id, { status: "error", error: "Erro de rede — verifique sua conexão." })
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
