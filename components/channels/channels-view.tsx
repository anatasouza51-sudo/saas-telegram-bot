"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import {
  listChannels,
  syncAllChannels,
  setChatPurpose,
  type TelegramDiagnostics,
} from "@/app/actions/tg-channels"
import { PERMISSION_LABELS } from "@/lib/tg/permissions"
import { PURPOSES, getPurposeMeta } from "@/lib/tg/purposes"
import { DiagnosticsPanel } from "@/components/channels/diagnostics-panel"
import { toast } from "sonner"
import {
  Search,
  MoreHorizontal,
  RefreshCw,
  Megaphone,
  Users,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Info,
  Check,
} from "lucide-react"

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
  memberCount: number | null
  lastSyncedAt: Date | string | null
}

const PAGE_SIZE = 10
const POLL_MS = 15000

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
      const rows = (await listChannels()) as ChannelRow[]
      setChannels(rows)
    } catch {
      // Ignore transient errors; next tick retries.
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

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-4">
      {!botConfigured && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Configure o token do bot em{" "}
          <span className="font-medium">Telegram Bot</span> para detectar e
          sincronizar grupos e canais.
        </div>
      )}

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-pretty">
          {
            "Não há cadastro manual. Adicione o bot como administrador em um grupo ou canal e ele aparece aqui automaticamente. Use \"Sincronizar Telegram\" para revalidar os dados quando quiser."
          }
        </p>
      </div>

      <DiagnosticsPanel initial={diagnostics} />

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
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Chat ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead>Membros</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Última sinc.</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={11}
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
              const granted = parsePerms(c.grantedPermissions)
              const missing = parsePerms(c.missingPermissions)
              const purpose = getPurposeMeta(c.purpose)
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
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.chatId}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.username ? `@${c.username.replace(/^@/, "")}` : "—"}
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
                  <TableCell>
                    {c.botIsAdmin ? (
                      <Badge
                        variant="outline"
                        className="border-success/30 bg-success/10 text-success"
                      >
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Administrador
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-muted-foreground/30 bg-muted text-muted-foreground"
                      >
                        Membro
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {granted.length === 0 && missing.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              className="text-left text-xs text-muted-foreground underline decoration-dotted underline-offset-2"
                            >
                              {granted.length} concedida(s)
                              {missing.length > 0
                                ? `, ${missing.length} faltando`
                                : ""}
                            </button>
                          }
                        />
                        <TooltipContent className="max-w-xs">
                          <div className="flex flex-col gap-1 text-xs">
                            {granted.length > 0 && (
                              <div>
                                <span className="font-medium text-success">
                                  Concedidas:
                                </span>{" "}
                                {granted
                                  .map((p) => PERMISSION_LABELS[p] ?? p)
                                  .join(", ")}
                              </div>
                            )}
                            {missing.length > 0 && (
                              <div>
                                <span className="font-medium text-warning">
                                  Faltando:
                                </span>{" "}
                                {missing
                                  .map((p) => PERMISSION_LABELS[p] ?? p)
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {typeof c.memberCount === "number"
                      ? c.memberCount.toLocaleString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {purpose.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.lastSyncedAt
                      ? new Date(c.lastSyncedAt).toLocaleString("pt-BR")
                      : "Nunca"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>
                            Função do grupo
                          </DropdownMenuLabel>
                          {PURPOSES.map((p) => (
                            <DropdownMenuItem
                              key={p.value}
                              disabled={pending}
                              onClick={() => handlePurpose(c.id, p.value)}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  c.purpose === p.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span>{p.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {p.description}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={syncing}
                          onClick={handleSync}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sincronizar agora
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
    </TooltipProvider>
  )
}
