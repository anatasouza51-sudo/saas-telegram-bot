"use client"

import { useMemo, useState, useTransition } from "react"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ChannelDialog } from "./channel-dialog"
import {
  deleteChannel,
  setChannelStatus,
  testChannelConnection,
} from "@/app/actions/tg-channels"
import { toast } from "sonner"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  PlugZap,
  Radio,
  Megaphone,
  Users,
  Database,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
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
  purpose: string
  lastSyncedAt: Date | null
}

const PAGE_SIZE = 10

const PURPOSE_META: Record<string, { label: string; icon: typeof Users }> = {
  audience: { label: "Audiência", icon: Users },
  cdn: { label: "CDN Privado", icon: Database },
  management: { label: "Gerenciamento", icon: ShieldAlert },
}

function parsePerms(json: string | null): string[] {
  if (!json) return []
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}

export function ChannelsView({
  channels,
  botConfigured,
}: {
  channels: ChannelRow[]
  botConfigured: boolean
}) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [purposeFilter, setPurposeFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<{ open: boolean; channel?: ChannelRow | null }>(
    { open: false },
  )

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
      if (purposeFilter !== "all" && c.purpose !== purposeFilter) return false
      return true
    })
  }, [channels, search, typeFilter, purposeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  function action(fn: () => Promise<unknown>, successMsg: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(successMsg)
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  function handleTest(id: number) {
    startTransition(async () => {
      try {
        const res = await testChannelConnection(id)
        if (res.ok) {
          toast.success("Conexão validada. Bot é administrador.")
        } else {
          toast.error(res.reason ?? "Falha na validação.", {
            description: res.missingPermissions?.length
              ? `Faltando: ${res.missingPermissions.join(", ")}`
              : undefined,
          })
        }
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {!botConfigured && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Configure o token do bot em{" "}
          <span className="font-medium">Telegram Bot</span> para validar e enviar
          postagens.
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
              all: "Toda função",
              audience: "Audiência",
              cdn: "CDN Privado",
              management: "Gerenciamento",
            }}
            value={purposeFilter}
            onValueChange={(v) => {
              setPurposeFilter(v as string)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda função</SelectItem>
              <SelectItem value="audience">Audiência</SelectItem>
              <SelectItem value="cdn">CDN Privado</SelectItem>
              <SelectItem value="management">Gerenciamento</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setDialog({ open: true, channel: null })}>
            <Plus className="mr-2 h-4 w-4" />
            Novo destino
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Destino</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Bot Admin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sincronização</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Radio className="h-8 w-8 opacity-40" />
                    Nenhum destino cadastrado.
                  </div>
                </TableCell>
              </TableRow>
            )}
            {paginated.map((c) => {
              const perms = parsePerms(c.missingPermissions)
              const purpose = PURPOSE_META[c.purpose] ?? PURPOSE_META.audience
              const PurposeIcon = purpose.icon
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{c.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.username ? `@${c.username.replace(/^@/, "")} • ` : ""}
                        {c.chatId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      {c.type === "channel" ? (
                        <Megaphone className="h-3.5 w-3.5" />
                      ) : (
                        <Users className="h-3.5 w-3.5" />
                      )}
                      {c.type === "channel"
                        ? "Canal"
                        : c.type === "supergroup"
                          ? "Supergrupo"
                          : "Grupo"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <PurposeIcon className="h-3.5 w-3.5" />
                      {purpose.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {c.botIsAdmin && perms.length === 0 ? (
                      <Badge
                        variant="outline"
                        className="border-success/30 bg-success/10 text-success"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        OK
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-destructive/30 bg-destructive/10 text-destructive"
                        title={perms.join(", ")}
                      >
                        <ShieldAlert className="mr-1 h-3 w-3" />
                        {c.botIsAdmin ? "Permissões" : "Bloqueado"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        c.status === "active"
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-muted-foreground/30 bg-muted text-muted-foreground"
                      }
                    >
                      {c.status === "active" ? "Ativo" : "Inativo"}
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
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={pending}
                          onClick={() => handleTest(c.id)}
                        >
                          <PlugZap className="mr-2 h-4 w-4" />
                          Testar conexão
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDialog({ open: true, channel: c })}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            action(
                              () =>
                                setChannelStatus(
                                  c.id,
                                  c.status === "active" ? "inactive" : "active",
                                ),
                              "Status atualizado",
                            )
                          }
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {c.status === "active" ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            action(() => deleteChannel(c.id), "Destino removido")
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
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

      <ChannelDialog
        open={dialog.open}
        onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))}
        channel={dialog.channel}
      />
    </div>
  )
}
