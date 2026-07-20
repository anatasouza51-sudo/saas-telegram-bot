"use client"
import { memo } from "react"
import { cn } from "@/lib/utils"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  Zap,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  dollar: DollarSign,
  shopping: ShoppingCart,
  users: Users,
  package: Package,
  alert: AlertTriangle,
  zap: Zap,
  check: CheckCircle2,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
}

const colorMap = {
  blue: "from-blue-600/20 to-blue-400/10 border-blue-500/20",
  purple: "from-purple-600/20 to-purple-400/10 border-purple-500/20",
  green: "from-green-600/20 to-green-400/10 border-green-500/20",
  red: "from-red-600/20 to-red-400/10 border-red-500/20",
  yellow: "from-yellow-600/20 to-yellow-400/10 border-yellow-500/20",
}

const iconColorMap = {
  blue: "text-blue-400/30",
  purple: "text-purple-400/30",
  green: "text-green-400/30",
  red: "text-red-400/30",
  yellow: "text-yellow-400/30",
}

const valueColorMap = {
  blue: "text-blue-300",
  purple: "text-purple-300",
  green: "text-green-300",
  red: "text-red-300",
  yellow: "text-yellow-300",
}

export const MetricCard = memo(({
  title,
  value,
  iconName,
  icon,
  trend,
  trendValue,
  color = "blue",
}: {
  title: string
  value: string
  iconName?: string
  icon?: LucideIcon
  trend?: "up" | "down"
  trendValue?: string
  color?: "blue" | "purple" | "green" | "red" | "yellow"
}) => {
  const Icon = iconName ? iconMap[iconName] : icon || DollarSign

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-gradient-to-br p-3 sm:p-4 transition-all duration-200 active:scale-[0.98]",
      colorMap[color]
    )}>
      {/* Ícone de fundo - Sem risco de sobreposição de layout */}
      <div className="absolute top-2 right-2 opacity-20">
        {Icon && <Icon className={cn("h-8 w-8 sm:h-10 sm:w-10", iconColorMap[color])} />}
      </div>

      <div className="relative z-10 flex flex-col">
        {/* Título */}
        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 pr-8 truncate">
          {title}
        </p>
        
        {/* Valor */}
        <p className={cn("text-xl sm:text-2xl font-bold leading-tight truncate", valueColorMap[color])}>
          {value}
        </p>

        {/* Tendência */}
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-1">
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3 text-green-400 shrink-0" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
            )}
            <span className={cn(
              "text-[10px] sm:text-xs font-semibold",
              trend === "up" ? "text-green-400" : "text-red-400"
            )}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
    </div>
  )
})
MetricCard.displayName = "MetricCard"
