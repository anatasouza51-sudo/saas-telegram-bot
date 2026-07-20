"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  ChevronDown,
  ChevronUp,
  Copy,
  RotateCcw,
} from "lucide-react"

type QueueItem = {
  id: number
  postId: number
  chatId: string
  status: string
  attempts: number
  lastError: string | null
  sentMessageId: number | null
  scheduledFor: string | Date
  createdAt: string | Date
  updatedAt: string | Date
}

type PostReport = {
  postId: number
  title: string | null
  status: string
  sentAt: string | null | Date
  queue: QueueItem[]
}

function getStatusBadge(status: string) {
  switch (status) {
    case "sent":
      return (
        <Badge className="bg-green-500/15 text-green-400 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Enviada
        </Badge>
      )
    case "failed":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" /> Falhou
        </Badge>
      )
    case "sent":
      return (
        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
          <Send className="w-3 h-3 mr-1" /> Enviada
        </Badge>
      )
    case "pending":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">
          <Clock className="w-3 h-3 mr-1" /> Pendente
        </Badge>
      )
    case "processing":
      return (
        <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30">
          <RotateCcw className="w-3 h-3 mr-1 animate-spin" /> Processando
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">{status}</Badge>
      )
  }
}

function getPostStatusBadge(status: string) {
  switch (status) {
    case "sent":
      return (
        <Badge className="bg-green-500/15 text-green-400 border-green-500/30 border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          Enviada
        </Badge>
      )
    case "failed":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/30 border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          Falhou
        </Badge>
      )
    case "queued":
      return (
        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          Na fila
        </Badge>
      )
    case "scheduled":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          Agendada
        </Badge>
      )
    case "draft":
      return (
        <Badge className="bg-white/10 text-muted-foreground border-white/20 border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          Rascunho
        </Badge>
      )
    default:
      return <Badge variant="secondary" className="text-[10px] uppercase">{status}</Badge>
  }
}

export function PostReport({ reports }: { reports: PostReport[] }) {
  if (reports.length === 0) {
    return (
      <Card className="p-6 text-center bg-slate-900/40 border-white/5 rounded-2xl">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground font-medium">
          Nenhum relatório de postagem disponível.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Os relatórios são gerados automaticamente após cada envio.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Relatório de Envios
        </p>
        <span className="text-[10px] text-muted-foreground/60">
          {reports.length} postagem(s)
        </span>
      </div>

      {reports.map((report) => {
        const sent = report.queue.filter((q) => q.status === "sent").length
        const failed = report.queue.filter((q) => q.status === "failed").length
        const pending = report.queue.filter((q) => q.status === "pending" || q.status === "processing").length
        const total = report.queue.length
        const successRate = total > 0 ? Math.round((sent / total) * 100) : 0

        return (
          <ReportCard
            key={report.postId}
            report={report}
            sent={sent}
            failed={failed}
            pending={pending}
            total={total}
            successRate={successRate}
          />
        )
      })}
    </div>
  )
}

function ReportCard({
  report,
  sent,
  failed,
  pending,
  total,
  successRate,
}: {
  report: PostReport
  sent: number
  failed: number
  pending: number
  total: number
  successRate: number
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white truncate">
              {report.title ?? `Postagem #${report.postId}`}
            </p>
            {getPostStatusBadge(report.status)}
          </div>
          {report.sentAt && (
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Enviada em {new Date(report.sentAt).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-lg font-black text-white leading-none">{successRate}%</p>
            <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest">sucesso</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-green-400 font-medium">{sent} enviadas</span>
            {failed > 0 && <span className="text-[9px] text-red-400 font-medium">{failed} falhas</span>}
            {pending > 0 && <span className="text-[9px] text-yellow-400 font-medium">{pending} pendentes</span>}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Barra de progresso */}
      <div className="px-4 pb-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5 flex">
          {total > 0 && (
            <>
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${(sent / total) * 100}%` }}
              />
              {failed > 0 && (
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${(failed / total) * 100}%` }}
                />
              )}
              {pending > 0 && (
                <div
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${(pending / total) * 100}%` }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="border-t border-white/5 p-4">
          <div className="flex flex-col gap-2">
            {report.queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">
                    {item.chatId}
                  </p>
                  {item.lastError && (
                    <p className="text-[10px] text-red-400/80 truncate mt-0.5">
                      Erro: {item.lastError}
                    </p>
                  )}
                  <p className="text-[9px] text-muted-foreground/50">
                    Tentativas: {item.attempts}/5
                    {item.sentMessageId ? ` · Msg ID: ${item.sentMessageId}` : ""}
                  </p>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
