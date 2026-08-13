import { memo } from "react"
import { cn } from "@/lib/utils"
import { DashboardBeam } from "@/components/dashboard-beam"

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
  blue: { icon: "text-violet-400", iconBg: "bg-violet-500/10", line: "from-violet-500/60", accent: "text-violet-300" },
  green: { icon: "text-violet-400", iconBg: "bg-violet-500/10", line: "from-violet-500/60", accent: "text-violet-300" },
  violet: { icon: "text-violet-400", iconBg: "bg-violet-500/10", line: "from-violet-500/60", accent: "text-violet-300" },
  amber: { icon: "text-violet-400", iconBg: "bg-violet-500/10", line: "from-violet-500/60", accent: "text-violet-300" },
}

export const SalesOverview = memo(({ metrics }: SalesOverviewProps) => {
  return (
    <section aria-label="Indicadores principais" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const colors = colorClasses[metric.color]
        return (
          <article
            key={metric.label}
            className="group relative overflow-hidden rounded-none border-0 bg-transparent p-4 sm:rounded-[20px] sm:border sm:border-dashboard-border sm:bg-dashboard-surface sm:p-5 sm:transition-colors sm:hover:border-dashboard-border-active"
          >
            <DashboardBeam />
            <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 hidden h-px bg-gradient-to-r to-transparent opacity-70 sm:block", colors.line)} />
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-dashboard-text-muted">{metric.label}</p>
                <p className="mt-5 font-space text-[2rem] font-bold leading-none tracking-tight text-dashboard-text sm:text-[2.15rem]">{metric.value}</p>
                {metric.helper && <p className={cn("mt-3 text-[11px] font-medium", colors.accent)}>{metric.helper}</p>}
              </div>
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 shadow-[0_0_14px_rgba(139,92,246,0.18)]", colors.iconBg, colors.icon)}>
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
