import { memo } from "react"
import { cn } from "@/lib/utils"

interface SalesMetric {
  label: string
  value: string | number
  icon: React.ReactNode
  color: "blue" | "green" | "teal" | "amber"
  helper?: string
}

interface SalesOverviewProps {
  metrics: SalesMetric[]
}

const colorClasses = {
  blue: { icon: "text-[#8FC5A3]", iconBg: "bg-[#4F8B7A]/10", line: "from-[#4F8B7A]/60", accent: "text-[#8FC5A3]" },
  green: { icon: "text-dashboard-accent", iconBg: "bg-dashboard-accent/10", line: "from-dashboard-accent/60", accent: "text-dashboard-accent" },
  teal: { icon: "text-[#7CA98D]", iconBg: "bg-[#7CA98D]/10", line: "from-[#7CA98D]/60", accent: "text-[#7CA98D]" },
  amber: { icon: "text-dashboard-accent-secondary", iconBg: "bg-dashboard-accent-secondary/10", line: "from-dashboard-accent-secondary/60", accent: "text-dashboard-accent-secondary" },
}

export const SalesOverview = memo(({ metrics }: SalesOverviewProps) => {
  return (
    <section aria-label="Indicadores principais" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const colors = colorClasses[metric.color]
        return (
          <article
            key={metric.label}
            className="group relative overflow-hidden rounded-[22px] border border-dashboard-border bg-dashboard-surface p-4 transition-colors hover:border-dashboard-border-active sm:rounded-[20px] sm:p-5"
          >
            <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 hidden h-px bg-gradient-to-r to-transparent opacity-70 sm:block", colors.line)} />
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-dashboard-text-muted">{metric.label}</p>
                <p className="mt-5 font-space text-[2rem] font-bold leading-none tracking-tight text-dashboard-text sm:text-[2.15rem]">{metric.value}</p>
                {metric.helper && <p className={cn("mt-3 text-[11px] font-medium", colors.accent)}>{metric.helper}</p>}
              </div>
              <div className={cn("dashboard-3d-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", colors.iconBg, colors.icon)}>
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
