"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface Epic {
  id: string
  title: string
  type: string
  status: "design" | "development" | "review" | "completed"
  icon: React.ReactNode
  color: "blue" | "green" | "yellow" | "purple" | "pink"
}

interface EpicsSectionProps {
  epics: Epic[]
  title?: string
}

const colorMap = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  yellow: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  purple: { bg: "bg-dashboard-accent/10", text: "text-dashboard-accent", border: "border-dashboard-accent/20" },
  pink: { bg: "bg-dashboard-accent-secondary/10", text: "text-dashboard-accent-secondary", border: "border-dashboard-accent-secondary/20" },
}

const statusMap = {
  design: { label: "Design", color: "text-blue-400" },
  development: { label: "Desenvolvimento", color: "text-dashboard-accent" },
  review: { label: "Review", color: "text-amber-400" },
  completed: { label: "Concluído", color: "text-emerald-400" },
}

export const EpicsSection = memo(({
  epics,
  title = "Epics",
}: EpicsSectionProps) => {
  if (epics.length === 0) {
    return null
  }

  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01] flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-dashboard-border/30">
          {epics.map((epic, index) => {
            const colors = colorMap[epic.color]
            const status = statusMap[epic.status]
            return (
              <motion.div
                key={epic.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  "p-4 hover:bg-white/[0.02] transition-all group cursor-pointer",
                  colors.bg
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 shrink-0",
                      colors.bg,
                      colors.text
                    )}>
                      {epic.icon}
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                      status.color,
                      "bg-white/5"
                    )}>
                      {status.label}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-dashboard-text line-clamp-2">
                      {epic.title}
                    </h4>
                    <p className="text-[10px] text-dashboard-text-muted mt-1">
                      {epic.type}
                    </p>
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

EpicsSection.displayName = "EpicsSection"
