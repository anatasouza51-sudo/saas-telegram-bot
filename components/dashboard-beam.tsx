import { cn } from "@/lib/utils"

interface DashboardBeamProps {
  className?: string
}

/** Uma única linha luminosa que percorre o perímetro arredondado do card. */
export function DashboardBeam({ className }: DashboardBeamProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("dashboard-beam-border", className)}
    />
  )
}
