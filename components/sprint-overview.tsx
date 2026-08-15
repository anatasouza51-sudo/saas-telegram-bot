"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SprintMetric {
  label: string
  value: number | string
  icon: React.ReactNode
  color: "pink" | "green" | "yellow" | "purple"
  trend?: "up" | "down"
}

interface SprintOverviewProps {
  metrics: SprintMetric[]
  sprintName?: string
  sprintStatus?: "active" | "completed" | "planned"
}

const colorClasses = {
  pink: {
    bg: "bg-dashboard-accent-secondary/10",
    border: "border-dashboard-accent-secondary/20",
    text: "text-dashboard-accent-secondary",
    dot: "bg-dashboard-accent-secondary",
  },
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
  },
  yellow: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
    dot: "bg-amber-500",
  },
  purple: {
    bg: "bg-dashboard-accent/10",
    border: "border-dashboard-accent/20",
    text: "text-dashboard-accent",
    dot: "bg-dashboard-accent",
  },
}

export const SprintOverview = memo(({
  metrics,
  sprintName = "Sprint Atual",
  sprintStatus = "active",
}: SprintOverviewProps) => {
  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
              {sprintName}
            </CardTitle>
            <CardDescription className="text-xs text-dashboard-text-muted mt-1">
              {sprintStatus === "active" && "Sprint em andamento"}
              {sprintStatus === "completed" && "Sprint concluído"}
              {sprintStatus === "planned" && "Sprint planejado"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              sprintStatus === "active" ? "bg-emerald-500" : "bg-dashboard-text-muted"
            )} />
            <span className="text-xs font-bold text-dashboard-text-muted uppercase">
              {sprintStatus === "active" ? "Ativo" : sprintStatus === "completed" ? "Concluído" : "Planejado"}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-dashboard-border/30">
          {metrics.map((metric, index) => {
            const colors = colorClasses[metric.color]
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  "p-4 hover:bg-white/[0.02] transition-colors group",
                  colors.bg
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-dashboard-text-muted uppercase tracking-wider">
                      {metric.label}
                    </span>
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                      colors.bg
                    )}>
                      {metric.icon}
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <h3 className="text-2xl font-black text-dashboard-text tracking-tight tabular-nums">
                      {metric.value}
                    </h3>
                    {metric.trend && (
                      <span className={cn(
                        "text-[10px] font-bold uppercase",
                        metric.trend === "up" ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {metric.trend === "up" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})

SprintOverview.displayName = "SprintOverview"
