"use client"

import { useCallback, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Upload,
  FolderPlus,
  Folder,
  Search,
  Copy,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Files,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { MediaThumb, formatBytes, type MediaItem } from "@/components/media/media-thumb"
import { useMediaUpload } from "@/components/media/use-media-upload"
import {
  createFolder,
  deleteFolder,
  deleteMedia,
  listMedia,
} from "@/app/actions/tg-media"

type Folder = { id: number; name: string; parentId: number | null }

const TYPE_LABELS: Record<string, string> = {
  photo: "Imagem",
  video: "Vídeo",
  animation: "GIF",
  document: "Documento",
  audio: "Áudio",
  sticker: "Sticker",
}

export function MediaLibrary({
  initialMedia,
  folders: initialFolders,
  cdnReady,
}: {
  initialMedia: MediaItem[]
  folders: Folder[]
  cdnReady: boolean
}) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia)
  const [folders, setFolders] = useState<Folder[]>(initialFolders)
  const [activeFolder, setActiveFolder] = useState<number | null>(null)
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [folderName, setFolderName] = useState("")
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const prependMedia = useCallback((m: MediaItem) => {
    setMedia((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev
      return [m, ...prev]
    })
  }, [])

  const { tasks, upload, clearDone } = useMediaUpload(prependMedia)

  const refresh = useCallback(
    (folderId: number | null, type: string, q: string) => {
      startTransition(async () => {
        const rows = (await listMedia({
          folderId,
          type,
          search: q || undefined,
        })) as unknown as MediaItem[]
        setMedia(rows)
      })
    },
    [],
  )

  function handleFiles(files: FileList | File[]) {
    if (!cdnReady) {
      toast.error("Configure o bot e o Grupo/Canal CDN em Telegram Bot primeiro.")
      return
    }
    upload(files, activeFolder)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  function selectFolder(id: number | null) {
    setActiveFolder(id)
    refresh(id, typeFilter, search)
  }

  async function submitNewFolder() {
    try {
      const row = await createFolder(folderName)
      setFolders((prev) => [...prev, row as Folder])
      setFolderName("")
      setNewFolderOpen(false)
      toast.success("Pasta criada")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar pasta")
    }
  }

  async function removeFolder(id: number) {
    try {
      await deleteFolder(id)
      setFolders((prev) => prev.filter((f) => f.id !== id))
      if (activeFolder === id) selectFolder(null)
      toast.success("Pasta removida")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover pasta")
    }
  }

  async function removeMedia(m: MediaItem) {
    try {
      await deleteMedia(m.id)
      setMedia((prev) => prev.filter((x) => x.id !== m.id))
      setSelected(null)
      toast.success("Mídia removida da biblioteca")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover")
    }
  }

  function copyFileId(fileId: string) {
    navigator.clipboard.writeText(fileId)
    toast.success("file_id copiado")
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Folder sidebar */}
      <aside className="flex shrink-0 flex-col gap-1 lg:w-56">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Pastas</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setNewFolderOpen(true)}
            aria-label="Nova pasta"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
        <button
          onClick={() => selectFolder(null)}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
            activeFolder === null
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted",
          )}
        >
          <Files className="h-4 w-4" />
          Todos os arquivos
        </button>
        {folders.map((f) => (
          <div
            key={f.id}
            className={cn(
              "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              activeFolder === f.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            <button
              onClick={() => selectFolder(f.id)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              <Folder className="h-4 w-4" />
              {f.name}
            </button>
            <button
              onClick={() => removeFolder(f.id)}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Remover pasta ${f.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  refresh(activeFolder, typeFilter, search)
                }
              }}
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              const next = (v as string) ?? "all"
              setTypeFilter(next)
              refresh(activeFolder, next, search)
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="photo">Imagens</SelectItem>
              <SelectItem value="video">Vídeos</SelectItem>
              <SelectItem value="animation">GIFs</SelectItem>
              <SelectItem value="document">Documentos</SelectItem>
              <SelectItem value="audio">Áudios</SelectItem>
              <SelectItem value="sticker">Stickers</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Enviar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files)
              e.target.value = ""
            }}
          />
        </div>

        {/* Upload progress */}
        {tasks.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Enviando arquivos</span>
              <Button variant="ghost" size="sm" onClick={clearDone}>
                Limpar concluídos
              </Button>
            </div>
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                {t.status === "uploading" && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                )}
                {t.status === "done" && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                )}
                {t.status === "error" && (
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="truncate">{t.name}</span>
                    <span className="text-muted-foreground">
                      {t.status === "error" ? t.error : `${t.progress}%`}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        t.status === "error" ? "bg-destructive" : "bg-primary",
                      )}
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dropzone + grid */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "min-h-[300px] rounded-lg border-2 border-dashed p-4 transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          {isPending ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : media.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Upload className="h-8 w-8" />
              <p className="text-sm">
                Arraste arquivos aqui ou clique em Enviar.
                <br />
                Tudo é armazenado no Telegram via file_id.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {media.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-primary"
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <MediaThumb media={m} />
                    <span className="absolute left-1.5 top-1.5 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
                      {TYPE_LABELS[m.type] ?? m.type}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-2">
                    <span className="truncate text-xs font-medium">
                      {m.fileName ?? "sem nome"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatBytes(m.fileSize)} · {m.usageCount} usos
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">
                  {selected.fileName ?? "Mídia"}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="mx-auto max-h-64 overflow-hidden rounded-lg border border-border">
                  <MediaThumb media={selected} className="max-h-64 w-auto" />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Tipo</dt>
                  <dd>{TYPE_LABELS[selected.type] ?? selected.type}</dd>
                  <dt className="text-muted-foreground">Tamanho</dt>
                  <dd>{formatBytes(selected.fileSize)}</dd>
                  {selected.width && selected.height ? (
                    <>
                      <dt className="text-muted-foreground">Dimensões</dt>
                      <dd>
                        {selected.width}×{selected.height}
                      </dd>
                    </>
                  ) : null}
                  <dt className="text-muted-foreground">Usos</dt>
                  <dd>{selected.usageCount}</dd>
                  <dt className="text-muted-foreground">Enviado por</dt>
                  <dd className="truncate">{selected.uploadedByName ?? "—"}</dd>
                </dl>
                <div className="flex items-center gap-2 rounded-md bg-muted p-2">
                  <code className="min-w-0 flex-1 truncate text-xs">
                    {selected.fileId}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyFileId(selected.fileId)}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    file_id
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => removeMedia(selected)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova pasta</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Nome da pasta"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) submitNewFolder()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitNewFolder}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
