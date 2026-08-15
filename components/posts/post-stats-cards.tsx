import { Card } from "@/components/ui/card"
import {
  Megaphone,
  CheckCircle2,
  XCircle,
  CalendarClock,
  CalendarDays,
  Radio,
} from "lucide-react"

type Stats = {
  total: number
  sent: number
  failed: number
  scheduled: number
  draft: number
  today: number
  week: number
  month: number
}

export function PostStatsCards({
  stats,
  channelCount,
}: {
  stats: Stats
  channelCount: number
}) {
  const successRate =
    stats.sent + stats.failed > 0
      ? Math.round((stats.sent / (stats.sent + stats.failed)) * 100)
      : 100

  const cards = [
    { label: "Total de postagens", value: stats.total, icon: Megaphone, color: "text-dashboard-accent" },
    { label: "Enviadas hoje", value: stats.today, icon: CalendarDays, color: "text-[#7CA98D]" },
    { label: "Enviadas na semana", value: stats.week, icon: CalendarDays, color: "text-[#7CA98D]" },
    { label: "Enviadas no mês", value: stats.month, icon: CalendarDays, color: "text-[#C9A95A]" },
    { label: "Sucesso", value: stats.sent, icon: CheckCircle2, color: "text-[#7CA98D]" },
    { label: "Falhas", value: stats.failed, icon: XCircle, color: "text-destructive" },
    { label: "Agendadas", value: stats.scheduled, icon: CalendarClock, color: "text-[#C9A95A]" },
    { label: "Grupos & canais", value: channelCount, icon: Radio, color: "text-dashboard-accent" },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Card de Taxa de Sucesso - Aumentado e Responsivo */}
      <Card className="flex flex-col items-center justify-between gap-6 rounded-2xl border-dashboard-border/30 bg-dashboard-card p-6 shadow-xl shadow-black/5 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-dashboard-text-muted">Taxa de sucesso</p>
          <p className="text-5xl font-black tracking-tighter text-dashboard-text">
            {successRate}%
          </p>
        </div>
        <div className="w-full sm:w-64">
          <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-widest text-dashboard-text-muted">
            <span>Eficiência Real</span>
            <span className="text-[#7CA98D]">{successRate}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border border-dashboard-border/20 bg-dashboard-bg/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-dashboard-accent to-[#7CA98D] shadow-[0_0_15px_rgba(169,201,127,0.25)]"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Grid de Estatísticas - Responsivo 2 colunas no mobile */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="flex flex-col gap-3 rounded-2xl border-dashboard-border/30 bg-dashboard-card p-5 shadow-lg shadow-black/5 transition-all hover:border-dashboard-accent/25">
            <c.icon className={`w-6 h-6 ${c.color}`} />
            <div>
              <p className="mb-1 text-3xl font-black leading-none tracking-tighter text-dashboard-text">{c.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest leading-tight text-dashboard-text-muted">{c.label}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
