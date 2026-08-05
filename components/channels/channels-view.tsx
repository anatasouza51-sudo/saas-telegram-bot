"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  listChannels,
  syncAllChannels,
  setChatPurpose,
  restartTelegramIntegration,
  removeChat,
  type TelegramDiagnostics,
} from "@/app/actions/tg-channels"

import { PURPOSES } from "@/lib/tg/purposes"

import { toast } from "sonner"
import {
  Search,
  RefreshCw,
  RotateCcw,
  Megaphone,
  Users,
  AlertTriangle,
  Radio,
  Trash2,
  AlertCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export type ChannelRow = {
  id: number
  title: string
  chatId: string
  username: string | null
  type: string
  description: string | null
  status: string
  botIsAdmin: boolean
  missingPermissions: string | null
  grantedPermissions: string | null
  purpose: string
  isForum: boolean
  memberCount: number | null
  lastSyncedAt: Date | string | null
}

const PAGE_SIZE = 10
const POLL_MS = 15000

// Map form for the base-ui Select `items` prop (value -> label).
const purposeItems: Record<string, string> = Object.fromEntries(
  PURPOSES.map((p) => [p.value, p.label]),
)

function parsePerms(json: string | null): string[] {
  if (!json) return []
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

// Derives the panel status from stored fields (no live API call needed).
type Status = {
  key: "removed" | "insufficient" | "member" | "online"
  label: string
  dot: string
  text: string
}

function deriveStatus(c: ChannelRow): Status {
  const missing = parsePerms(c.missingPermissions)
  if (c.status !== "active") {
    return {
      key: "removed",
      label: "Removido",
      dot: "bg-destructive",
      text: "text-destructive",
    }
  }
  if (!c.botIsAdmin) {
    return {
      key: "member",
      label: "Apenas membro",
      dot: "bg-muted-foreground",
      text: "text-muted-foreground",
    }
  }
  if (missing.length > 0) {
    return {
      key: "insufficient",
      label: "Sem permissões suficientes",
      dot: "bg-warning",
      text: "text-warning",
    }
  }
  return {
    key: "online",
    label: "Online",
    dot: "bg-success",
    text: "text-success",
  }
}

function typeLabel(type: string) {
  return type === "channel"
    ? "Canal"
    : type === "supergroup"
      ? "Supergrupo"
      : "Grupo"
}

export function ChannelsView({
  channels: initialChannels,
  
  botConfigured,
  diagnostics,
}: {
  channels: ChannelRow[]
  
  botConfigured: boolean
  diagnostics: TelegramDiagnostics | null
}) {
  const [channels, setChannels] = useState<ChannelRow[]>(initialChannels)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [syncing, startSync] = useTransition()
  const [pending, startTransition] = useTransition()

  const searchRef = useRef(search)
  searchRef.current = search

  // Auto-refresh: silently re-fetch the list so newly detected chats and
  // status/permission changes appear without any manual action.
  const refresh = useCallback(async () => {
    try {
      const rows = await listChannels()
      setChannels(rows)
    } catch (err) {
      // Transient errors are retried on the next tick, but must be traceable.
      console.error("[channels] auto-refresh failed:", err)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(refresh, POLL_MS)
    const onFocus = () => refresh()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener("focus", onFocus)
    }
  }, [refresh])

  const filtered = useMemo(() => {
    return channels.filter((c) => {
      if (
        search &&
        !`${c.title} ${c.chatId} ${c.username ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false
      if (typeFilter !== "all" && c.type !== typeFilter) return false
      if (statusFilter !== "all" && deriveStatus(c).key !== statusFilter)
        return false
      return true
    })
  }, [channels, search, typeFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  function handleSync() {
    startSync(async () => {
      const res = await syncAllChannels()
      if (res.ok) {
        toast.success(
          `Sincronizado: ${res.updated ?? 0} ativo(s), ${res.removed ?? 0} indisponível(is).`,
        )
        await refresh()
      } else {
        toast.error(res.error ?? "Falha ao sincronizar.")
      }
    })
  }

  function handleRestart() {
    startSync(async () => {
      const res = await restartTelegramIntegration()
      if (res.ok) {
        toast.success(
          `Integração reiniciada: ${res.purged ?? 0} inválido(s) removido(s), ${res.updated ?? 0} sincronizado(s).`,
        )
        await refresh()
      } else {
        toast.error(res.error ?? "Falha ao reiniciar a integração.")
      }
    })
  }



  function handlePurpose(id: number, purpose: string) {
    startTransition(async () => {
      try {
        await setChatPurpose(id, purpose)
        toast.success("Função atualizada.")
        await refresh()
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  const [removeDialog, setRemoveDialog] = useState<{ id: number; title: string } | null>(null)

  function handleRemoveClick(id: number, title: string) {
    setRemoveDialog({ id, title })
  }

  function handleRemoveConfirm() {
    if (!removeDialog) return
    const { id, title } = removeDialog
    setRemoveDialog(null)
    startTransition(async () => {
      try {
        const res = await removeChat(id)
        if (res.ok) {
          toast.success(`"${title}" removido da lista.`)
          await refresh()
        } else {
          toast.error(res.error ?? "Falha ao remover.")
        }
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  return (
    <>
    <div className="flex flex-col gap-4">
      {!botConfigured && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Configure o token do bot em{" "}
          <span className="font-medium">Telegram Bot</span> para detectar e
          sincronizar grupos e canais.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nome, ID ou @username..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={{
              all: "Todos tipos",
              group: "Grupos",
              supergroup: "Supergrupos",
              channel: "Canais",
            }}
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v as string)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="group">Grupos</SelectItem>
              <SelectItem value="supergroup">Supergrupos</SelectItem>
              <SelectItem value="channel">Canais</SelectItem>
            </SelectContent>
          </Select>
          <Select
            items={{
              all: "Todo status",
              online: "Online",
              insufficient: "Sem permissões",
              member: "Apenas membro",
              removed: "Removido",
            }}
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as string)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="insufficient">Sem permissões</SelectItem>
              <SelectItem value="member">Apenas membro</SelectItem>
              <SelectItem value="removed">Removido</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSync} disabled={syncing || !botConfigured}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            />
            Sincronizar Telegram
          </Button>
          <Button
            variant="outline"
            onClick={handleRestart}
            disabled={syncing || !botConfigured}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reiniciar Integração
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Membros</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="w-[50px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-40 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Radio className="h-8 w-8 opacity-40" />
                    <span className="font-medium">
                      Nenhum grupo ou canal detectado ainda.
                    </span>
                    <span className="max-w-sm text-xs">
                      Adicione o bot como administrador em um grupo ou canal do
                      Telegram. Ele será detectado e listado aqui
                      automaticamente.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {paginated.map((c) => {
              const st = deriveStatus(c)
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="font-medium">{c.title}</span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      {c.type === "channel" ? (
                        <Megaphone className="h-3.5 w-3.5" />
                      ) : (
                        <Users className="h-3.5 w-3.5" />
                      )}
                      {typeLabel(c.type)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-medium ${st.text}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${st.dot}`}
                        aria-hidden
                      />
                      {st.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {typeof c.memberCount === "number"
                      ? c.memberCount.toLocaleString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      items={purposeItems}
                      value={c.purpose}
                      onValueChange={(v) => handlePurpose(c.id, v as string)}
                    >
                      <SelectTrigger className="w-[190px]" disabled={pending}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PURPOSES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveClick(c.id, c.title)
                      }}
                      disabled={pending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>



      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filtered.length} destino(s) — página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>

    <Dialog open={!!removeDialog} onOpenChange={(open) => !open && setRemoveDialog(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>Remover "{removeDialog?.title}"?</DialogTitle>
              <DialogDescription>
                O bot continuará no grupo/canal, mas ele não será mais gerenciado pelo painel.
                Você poderá adicioná-lo novamente a qualquer momento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRemoveDialog(null)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleRemoveConfirm} disabled={pending}>
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
