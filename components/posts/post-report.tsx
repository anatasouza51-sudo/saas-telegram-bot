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
        <Badge className="border-[#7CA98D]/30 bg-[#7CA98D]/15 text-[#7CA98D]">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Enviada
        </Badge>
      )
    case "failed":
      return (
        <Badge className="border-destructive/30 bg-destructive/15 text-destructive">
          <XCircle className="w-3 h-3 mr-1" /> Falhou
        </Badge>
      )
    case "sent":
      return (
        <Badge className="border-dashboard-accent/30 bg-dashboard-accent/15 text-dashboard-accent">
          <Send className="w-3 h-3 mr-1" /> Enviada
        </Badge>
      )
    case "pending":
      return (
        <Badge className="border-[#C9A95A]/30 bg-[#C9A95A]/15 text-[#C9A95A]">
          <Clock className="w-3 h-3 mr-1" /> Pendente
        </Badge>
      )
    case "processing":
      return (
        <Badge className="border-dashboard-accent/30 bg-dashboard-accent/15 text-dashboard-accent">
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
        <Badge className="border-[#7CA98D]/30 bg-[#7CA98D]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7CA98D]">
          Enviada
        </Badge>
      )
    case "failed":
      return (
        <Badge className="border-destructive/30 bg-destructive/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
          Falhou
        </Badge>
      )
    case "queued":
      return (
        <Badge className="border-dashboard-accent/30 bg-dashboard-accent/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-dashboard-accent">
          Na fila
        </Badge>
      )
    case "scheduled":
      return (
        <Badge className="border-[#C9A95A]/30 bg-[#C9A95A]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C9A95A]">
          Agendada
        </Badge>
      )
    case "draft":
      return (
        <Badge className="border-dashboard-border/30 bg-dashboard-bg/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-dashboard-text-muted">
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
      <Card className="rounded-2xl border-dashboard-border/30 bg-dashboard-card p-8 text-center shadow-xl shadow-black/5">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-dashboard-accent/30" />
          <p className="text-sm font-medium text-dashboard-text-muted">
          Nenhum relatório de postagem disponível.
        </p>
          <p className="mt-1 text-xs text-dashboard-text-muted/60">
          Os relatórios são gerados automaticamente após cada envio.
        </p>
      </Card>
    )
  }

  return (
      <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-dashboard-border/20 bg-dashboard-surface/45 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-dashboard-text-muted">
          Relatório de envios
        </p>
        <span className="text-[10px] text-dashboard-text-muted/60">
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
      <Card className="overflow-hidden rounded-2xl border-dashboard-border/30 bg-dashboard-card shadow-xl shadow-black/5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-dashboard-surface/60 sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="truncate text-sm font-bold text-dashboard-text">
              {report.title ?? `Postagem #${report.postId}`}
            </p>
            {getPostStatusBadge(report.status)}
          </div>
          {report.sentAt && (
              <p className="mt-1 text-[10px] text-dashboard-text-muted/60">
              Enviada em {new Date(report.sentAt).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-lg font-black leading-none text-dashboard-text">{successRate}%</p>
            <p className="text-[9px] uppercase tracking-widest text-dashboard-text-muted/60">sucesso</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-medium text-[#7CA98D]">{sent} enviadas</span>
            {failed > 0 && <span className="text-[9px] font-medium text-destructive">{failed} falhas</span>}
            {pending > 0 && <span className="text-[9px] font-medium text-[#C9A95A]">{pending} pendentes</span>}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Barra de progresso */}
        <div className="px-4 pb-3 sm:px-5">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-dashboard-bg/60">
          {total > 0 && (
            <>
              <div
                className="h-full bg-[#7CA98D] transition-all"
                style={{ width: `${(sent / total) * 100}%` }}
              />
              {failed > 0 && (
                <div
                  className="h-full bg-destructive transition-all"
                  style={{ width: `${(failed / total) * 100}%` }}
                />
              )}
              {pending > 0 && (
                <div
                  className="h-full bg-[#C9A95A] transition-all"
                  style={{ width: `${(pending / total) * 100}%` }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="border-t border-dashboard-border/20 p-4 sm:p-5">
          <div className="flex flex-col gap-2">
            {report.queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-dashboard-border/15 bg-dashboard-bg/35 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-dashboard-text">
                    {item.chatId}
                  </p>
                  {item.lastError && (
                    <p className="mt-0.5 truncate text-[10px] text-destructive/80">
                      Erro: {item.lastError}
                    </p>
                  )}
                  <p className="text-[9px] text-dashboard-text-muted/50">
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
