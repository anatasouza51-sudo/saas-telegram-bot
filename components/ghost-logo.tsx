import Image from "next/image"

export function GhostLogo({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Halo discreto da identidade Campo Operacional */}
      <div className="absolute inset-0 bg-dashboard-accent/18 blur-xl rounded-full animate-pulse" />
      
      <div className="relative flex h-20 w-20 items-center justify-center">
        <Image 
          src="/ghostbot-final-logo.png" 
          alt="GHOST BOT Logo" 
          width={80} 
          height={80} 
          className="object-contain [filter:sepia(1)_saturate(1.65)_hue-rotate(35deg)_brightness(1.08)]"
          priority
        />
      </div>
    </div>
  )
}
