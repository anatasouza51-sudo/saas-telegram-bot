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
    default: "bg-white/5 text-muted-foreground ring-white/10",
    primary: "bg-primary/20 text-primary ring-1 ring-primary/50 shadow-[0_0_20px_rgba(0,255,255,0.4)]",
    success: "bg-success/20 text-success ring-1 ring-success/50 shadow-[0_0_20px_rgba(34,197,94,0.4)]",
    warning: "bg-warning/20 text-warning ring-1 ring-warning/50 shadow-[0_0_20px_rgba(234,179,8,0.4)]",
    destructive: "bg-destructive/20 text-destructive ring-1 ring-destructive/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]",
  }

  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
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
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:scale-110 duration-300",
            toneMap[tone],
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
      </CardContent>
    </Card>
  )
}
