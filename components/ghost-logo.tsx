import Image from "next/image"

export function GhostLogo({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Glow Effect matching the new purple logo */}
      <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
      
      <div className="relative flex h-20 w-20 items-center justify-center">
        <Image 
          src="/ghostbot-final-logo.png" 
          alt="GhostBot Logo" 
          width={80} 
          height={80} 
          className="object-contain"
          priority
        />
      </div>
    </div>
  )
}
