import Image from "next/image"

export function GhostLogo({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Subtle Glow para o novo tema sombrio */}
      <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full animate-pulse" />
      
      <div className="relative flex h-20 w-20 items-center justify-center">
        <Image 
          src="/ghost-icon.png" 
          alt="GHOST BOT Logo" 
          width={100} 
          height={100} 
          className="object-contain brightness-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          priority
        />
      </div>
    </div>
  )
}
