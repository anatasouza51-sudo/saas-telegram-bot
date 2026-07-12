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
    { label: "Total de postagens", value: stats.total, icon: Megaphone },
    { label: "Enviadas hoje", value: stats.today, icon: CalendarDays },
    { label: "Enviadas na semana", value: stats.week, icon: CalendarDays },
    { label: "Enviadas no mês", value: stats.month, icon: CalendarDays },
    { label: "Sucesso", value: stats.sent, icon: CheckCircle2 },
    { label: "Falhas", value: stats.failed, icon: XCircle },
    { label: "Agendadas", value: stats.scheduled, icon: CalendarClock },
    { label: "Grupos & canais", value: channelCount, icon: Radio },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">Taxa de sucesso</p>
          <p className="text-3xl font-semibold text-foreground">
            {successRate}%
          </p>
        </div>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-success"
            style={{ width: `${successRate}%` }}
          />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="flex flex-col gap-2 p-4">
            <c.icon className="size-5 text-muted-foreground" />
            <p className="text-2xl font-semibold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
