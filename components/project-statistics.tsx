"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ProjectStat {
  label: string
  value: number
  unit?: string
  color: "pink" | "green" | "yellow" | "purple"
}

interface ProjectStatisticsProps {
  stats: ProjectStat[]
  title?: string
  subtitle?: string
}

const colorClasses = {
  pink: { stroke: "#D17D55", light: "text-dashboard-accent-secondary" },
  green: { stroke: "#34D399", light: "text-emerald-400" },
  yellow: { stroke: "#FBBF24", light: "text-amber-400" },
  purple: { stroke: "#A9C97F", light: "text-dashboard-accent" },
}

const CircularProgress = memo(({
  value,
  color,
  size = 120,
}: {
  value: number
  color: "pink" | "green" | "yellow" | "purple"
  size?: number
}) => {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const colors = colorClasses[color]

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="4"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="4"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeInOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={cn("text-lg font-black", colors.light)}>
          {value}%
        </span>
      </div>
    </div>
  )
})

CircularProgress.displayName = "CircularProgress"

export const ProjectStatistics = memo(({
  stats,
  title = "Estatísticas do Projeto",
  subtitle = "Progresso geral",
}: ProjectStatisticsProps) => {
  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01]">
        <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-dashboard-text-muted mt-1">
          {subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex flex-col items-center gap-3"
            >
              <CircularProgress value={stat.value} color={stat.color} size={100} />
              <div className="text-center">
                <p className="text-xs font-bold text-dashboard-text">{stat.label}</p>
                {stat.unit && (
                  <p className="text-[10px] text-dashboard-text-muted mt-1">{stat.unit}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

ProjectStatistics.displayName = "ProjectStatistics"
