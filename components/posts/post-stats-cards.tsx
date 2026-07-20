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
    { label: "Total de postagens", value: stats.total, icon: Megaphone, color: "text-blue-400" },
    { label: "Enviadas hoje", value: stats.today, icon: CalendarDays, color: "text-purple-400" },
    { label: "Enviadas na semana", value: stats.week, icon: CalendarDays, color: "text-blue-300" },
    { label: "Enviadas no mês", value: stats.month, icon: CalendarDays, color: "text-purple-300" },
    { label: "Sucesso", value: stats.sent, icon: CheckCircle2, color: "text-green-400" },
    { label: "Falhas", value: stats.failed, icon: XCircle, color: "text-red-400" },
    { label: "Agendadas", value: stats.scheduled, icon: CalendarClock, color: "text-yellow-400" },
    { label: "Grupos & canais", value: channelCount, icon: Radio, color: "text-primary" },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Card de Taxa de Sucesso - Aumentado e Responsivo */}
      <Card className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-900/40 border-white/5 rounded-2xl shadow-xl gap-6">
        <div className="text-center sm:text-left">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Taxa de sucesso</p>
          <p className="text-5xl font-black text-white tracking-tighter">
            {successRate}%
          </p>
        </div>
        <div className="w-full sm:w-64">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            <span>Eficiência Real</span>
            <span className="text-success">{successRate}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-success to-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Grid de Estatísticas - Responsivo 2 colunas no mobile */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="flex flex-col gap-3 p-5 bg-slate-900/40 border-white/5 rounded-2xl shadow-lg transition-all hover:border-white/10">
            <c.icon className={`w-6 h-6 ${c.color}`} />
            <div>
              <p className="text-3xl font-black text-white tracking-tighter leading-none mb-1">{c.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{c.label}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
