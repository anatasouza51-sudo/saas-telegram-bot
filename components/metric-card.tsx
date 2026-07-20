"use client"

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown } from "lucide-react"

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "blue",
}: {
  title: string
  value: string
  icon: LucideIcon
  trend?: "up" | "down"
  trendValue?: string
  color?: "blue" | "purple" | "green" | "red" | "yellow"
}) {
  const colorMap = {
    blue: "from-blue-600/20 to-blue-400/10 text-blue-400 ring-blue-500/30",
    purple: "from-purple-600/20 to-purple-400/10 text-purple-400 ring-purple-500/30",
    green: "from-green-600/20 to-green-400/10 text-green-400 ring-green-500/30",
    red: "from-red-600/20 to-red-400/10 text-red-400 ring-red-500/30",
    yellow: "from-yellow-600/20 to-yellow-400/10 text-yellow-400 ring-yellow-500/30",
  }

  const iconColorMap = {
    blue: "bg-gradient-to-br from-blue-500/30 to-blue-400/20 text-blue-300 ring-blue-400/40",
    purple: "bg-gradient-to-br from-purple-500/30 to-purple-400/20 text-purple-300 ring-purple-400/40",
    green: "bg-gradient-to-br from-green-500/30 to-green-400/20 text-green-300 ring-green-400/40",
    red: "bg-gradient-to-br from-red-500/30 to-red-400/20 text-red-300 ring-red-400/40",
    yellow: "bg-gradient-to-br from-yellow-500/30 to-yellow-400/20 text-yellow-300 ring-yellow-400/40",
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer">
      {/* Background gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", colorMap[color])} />
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/5 to-transparent" />
      
      {/* Border */}
      <div className={cn("absolute inset-0 rounded-2xl border ring-1", colorMap[color])} />

      {/* Content */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {title}
          </p>
          <p className="text-4xl md:text-5xl font-bold text-white mb-3">
            {value}
          </p>
          
          {trend && trendValue && (
            <div className="flex items-center gap-1">
              {trend === "up" ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className={cn(
                "text-sm font-semibold",
                trend === "up" ? "text-green-400" : "text-red-400"
              )}>
                {trendValue}
              </span>
            </div>
          )}
        </div>

        {/* Icon */}
        <div className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 transition-all duration-300 group-hover:scale-110",
          iconColorMap[color]
        )}>
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </div>
  )
}
