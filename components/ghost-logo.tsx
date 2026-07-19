import { Ghost } from "lucide-react"

export function GhostLogo({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Glow Effect */}
      <div className="absolute inset-0 animate-pulse bg-primary/20 blur-2xl rounded-full" />
      
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-blue-600 shadow-[0_0_20px_rgba(139,92,246,0.5)]">
        <Ghost className="h-10 w-10 text-white animate-bounce-slow" />
      </div>
    </div>
  )
}
