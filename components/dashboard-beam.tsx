import { cn } from "@/lib/utils"

interface DashboardBeamProps {
  className?: string
}

/** Feixe decorativo vertical inspirado no efeito observado na SharkBot. */
export function DashboardBeam({ className }: DashboardBeamProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute left-1/2 top-0 z-0 h-1/2 w-10 -translate-x-1/2 -translate-y-[120%] rounded-full",
        "bg-gradient-to-b from-transparent via-dashboard-accent-secondary/45 to-transparent blur-[5px]",
        "animate-dashboard-beam",
        className,
      )}
    />
  )
}
