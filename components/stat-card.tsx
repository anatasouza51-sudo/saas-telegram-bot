import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  title: string
  value: string
  icon: LucideIcon
  hint?: string
  tone?: "default" | "success" | "warning" | "destructive" | "primary"
}) {
  const toneMap = {
    default: "bg-gradient-to-br from-white/10 to-white/5 text-muted-foreground ring-1 ring-white/20 shadow-lg shadow-teal-500/5",
    primary: "bg-gradient-to-br from-teal-600/20 to-teal-400/10 text-teal-400 border border-teal-500/30 shadow-lg shadow-teal-500/20",
    success: "bg-gradient-to-br from-green-600/20 to-green-400/10 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/20",
    warning: "bg-gradient-to-br from-yellow-600/20 to-yellow-400/10 text-yellow-400 border border-yellow-500/30 shadow-lg shadow-yellow-500/20",
    destructive: "bg-gradient-to-br from-red-600/20 to-red-400/10 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/20",
  }

  const iconToneMap = {
    default: "bg-gradient-to-br from-teal-500/30 to-violet-500/20 text-teal-300 ring-1 ring-teal-400/40",
    primary: "bg-gradient-to-br from-teal-500/40 to-teal-400/30 text-teal-100 ring-1 ring-teal-400/50",
    success: "bg-gradient-to-br from-green-500/40 to-green-400/30 text-green-200 ring-1 ring-green-400/50",
    warning: "bg-gradient-to-br from-yellow-500/40 to-yellow-400/30 text-yellow-200 ring-1 ring-yellow-400/50",
    destructive: "bg-gradient-to-br from-red-500/40 to-red-400/30 text-red-200 ring-1 ring-red-400/50",
  }

  return (
    <Card className="relative overflow-hidden group border-0 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10">
      {/* Glow background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-violet-500/5 pointer-events-none" />
      
      {/* Icon background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300">
        <Icon className="h-24 w-24 -mr-8 -mt-8 rotate-12" />
      </div>
      
      <CardContent className="flex items-center justify-between gap-4 p-6 relative z-10">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
          {hint && (
            <p className="mt-1 truncate text-xs font-medium text-muted-foreground/80">
              {hint}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
            iconToneMap[tone],
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
      </CardContent>
    </Card>
  )
}
