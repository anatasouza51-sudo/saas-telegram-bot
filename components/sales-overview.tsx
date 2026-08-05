"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SalesMetric {
  label: string
  value: string | number
  icon: React.ReactNode
  color: "pink" | "green" | "yellow" | "purple"
}

interface SalesOverviewProps {
  metrics: SalesMetric[]
}

const colorClasses = {
  pink: "from-pink-500/20 to-pink-500/5 border-pink-500/20 hover:border-pink-500/40",
  green: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40",
  yellow: "from-amber-500/20 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40",
  purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 hover:border-purple-500/40",
}

export const SalesOverview = memo(({
  metrics,
}: SalesOverviewProps) => {
  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01] backdrop-blur-sm">
        <div>
          <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
            Visão Geral de Vendas
          </CardTitle>
          <CardDescription className="text-xs text-dashboard-text-muted mt-1">
            Métricas principais do seu negócio
          </CardDescription>
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
                  "p-5 hover:bg-gradient-to-br transition-all duration-300 group backdrop-blur-sm border-0",
                  colors
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-dashboard-text-muted uppercase tracking-widest">
                      {metric.label}
                    </span>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                      "bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md",
                      "shadow-lg group-hover:shadow-xl"
                    )}>
                      <div className="text-dashboard-text-muted group-hover:text-dashboard-accent transition-colors">
                        {metric.icon}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-dashboard-text tracking-tight tabular-nums">
                      {metric.value}
                    </h3>
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

SalesOverview.displayName = "SalesOverview"
