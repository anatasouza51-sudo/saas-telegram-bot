"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDateTime } from "@/lib/format"
import { getRecentLogs } from "@/app/actions/logs"
import { toast } from "sonner"

type Log = {
  id: number
  action: string
  category: string
  actorName: string | null
  details: string | null
  createdAt: Date
}

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-blue-500/10 text-blue-400",
  product: "bg-green-500/10 text-green-400",
  stock: "bg-yellow-500/10 text-yellow-400",
  order: "bg-purple-500/10 text-purple-400",
  payment: "bg-emerald-500/10 text-emerald-400",
  delivery: "bg-orange-500/10 text-orange-400",
  customer: "bg-pink-500/10 text-pink-400",
  admin: "bg-red-500/10 text-red-400",
  settings: "bg-cyan-500/10 text-cyan-400",
  security: "bg-red-600/10 text-red-500",
  posts: "bg-indigo-500/10 text-indigo-400",
  system: "bg-gray-500/10 text-gray-400",
}

const CATEGORY_LABELS: Record<string, string> = {
  auth: "Autenticação",
  product: "Produtos",
  stock: "Estoque",
  order: "Pedidos",
  payment: "Pagamentos",
  delivery: "Entregas",
  customer: "Clientes",
  admin: "Administração",
  settings: "Configurações",
  security: "Segurança",
  posts: "Postagens",
  system: "Sistema",
}

export function NotificationsPopover() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getRecentLogs(20)
      setLogs(result)
      setUnreadCount(result.length > 0 ? Math.min(result.length, 9) : 0)
    } catch (e) {
      console.error("Erro ao carregar notificações:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchLogs()
      // Atualizar a cada 5 segundos quando o popover está aberto
      const interval = setInterval(fetchLogs, 5000)
      return () => clearInterval(interval)
    }
  }, [open, fetchLogs])

  const handleClearAll = async () => {
    setLogs([])
    setUnreadCount(0)
    toast.success("Notificações limpas")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-white/5 relative"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Notificações</h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 px-2 text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="h-96">
            {loading ? (
              <div className="flex items-center justify-center h-full p-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma notificação no momento
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-xs ${
                          CATEGORY_COLORS[log.category] ||
                          "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {CATEGORY_LABELS[log.category] || log.category}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white break-words">
                          {log.action}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.actorName ? `Por ${log.actorName}` : "Sistema"}
                          {log.details ? ` · ${log.details}` : ""}
                        </p>
                        <time className="text-xs text-muted-foreground/70 mt-1 block">
                          {formatDateTime(log.createdAt)}
                        </time>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {logs.length > 0 && (
            <div className="border-t border-border p-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setOpen(false)
                  // Navegar para página de logs completos
                  window.location.href = "/logs"
                }}
              >
                Ver todos os logs
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
