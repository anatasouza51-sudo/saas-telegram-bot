import { memo } from "react"
import { cn } from "@/lib/utils"

interface SalesMetric {
  label: string
  value: string | number
  icon: React.ReactNode
  color: "blue" | "green" | "violet" | "amber"
  helper?: string
}

interface SalesOverviewProps {
  metrics: SalesMetric[]
}

const colorClasses = {
  blue: { icon: "text-blue-400", iconBg: "bg-blue-500/10", line: "from-blue-500/60", accent: "text-blue-300" },
  green: { icon: "text-emerald-400", iconBg: "bg-emerald-500/10", line: "from-emerald-500/60", accent: "text-emerald-300" },
  violet: { icon: "text-violet-400", iconBg: "bg-violet-500/10", line: "from-violet-500/60", accent: "text-violet-300" },
  amber: { icon: "text-amber-400", iconBg: "bg-amber-500/10", line: "from-amber-500/60", accent: "text-amber-300" },
}

export const SalesOverview = memo(({ metrics }: SalesOverviewProps) => {
  return (
    <section aria-label="Indicadores principais" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const colors = colorClasses[metric.color]
        return (
          <article
            key={metric.label}
            className="group relative p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-dashboard-text-muted">{metric.label}</p>
                <p className="mt-5 font-space text-[2rem] font-bold leading-none tracking-tight text-dashboard-text sm:text-[2.15rem]">{metric.value}</p>
                {metric.helper && <p className={cn("mt-3 text-[11px] font-medium", colors.accent)}>{metric.helper}</p>}
              </div>
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.05]", colors.iconBg, colors.icon)}>
                <span className="flex size-5 shrink-0 items-center justify-center [&>svg]:size-4">{metric.icon}</span>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
})

SalesOverview.displayName = "SalesOverview"
