"use client"

import { useEffect, useState } from "react"
import { Bell, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDateTime } from "@/lib/format"
import { getRecentLogs } from "@/app/actions/logs"

type LogEntry = {
  id: string
  action: string
  category: string
  actorName?: string
  details?: string
  createdAt: Date
}

const CATEGORY_COLORS: Record<string, string> = {
  payment: "bg-green-500/10 text-green-400",
  order: "bg-blue-500/10 text-blue-400",
  product: "bg-purple-500/10 text-purple-400",
  user: "bg-yellow-500/10 text-yellow-400",
  system: "bg-gray-500/10 text-gray-400",
}

const CATEGORY_LABELS: Record<string, string> = {
  payment: "Pagamento",
  order: "Pedido",
  product: "Produto",
  user: "Usuário",
  system: "Sistema",
}

export function NotificationsPopover() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (open) {
      loadLogs()
    }
  }, [open])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await getRecentLogs(20)
      setLogs(data || [])
      setUnreadCount(0)
    } catch (error) {
      console.error("Erro ao carregar logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearAll = async () => {
    // A função clearAllLogs não existe no momento no servidor
    console.warn("Limpeza de logs não implementada no servidor")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-white/5 h-8 w-8"
          aria-label="Notificações"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>

      {/* Popover responsivo — max-w em mobile */}
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 p-0" align="end">
        <div className="flex flex-col max-h-[70vh] sm:max-h-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs sm:text-sm">Notificações</h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] sm:text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 px-2 text-[10px] sm:text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Limpar</span>
              </Button>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32 sm:h-40">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 sm:h-40 p-3 text-center">
                <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50 mb-2" />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Nenhuma notificação
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 sm:p-3 hover:bg-white/5 transition-colors cursor-pointer text-xs sm:text-sm"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-[9px] sm:text-xs ${
                          CATEGORY_COLORS[log.category] ||
                          "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {CATEGORY_LABELS[log.category] || log.category}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white break-words">
                          {log.action}
                        </p>
                        <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">
                          {log.actorName ? `Por ${log.actorName}` : "Sistema"}
                          {log.details ? ` · ${log.details}` : ""}
                        </p>
                        <time className="text-[8px] sm:text-xs text-muted-foreground/70 mt-0.5 block">
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
            <div className="border-t border-border p-2 sm:p-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-[10px] sm:text-xs h-7 sm:h-8"
                onClick={() => {
                  setOpen(false)
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
