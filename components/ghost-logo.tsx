import Image from "next/image"

export function GhostLogo({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Glow Effect */}
      <div className="absolute inset-0 animate-pulse bg-primary/20 blur-2xl rounded-full" />
      
      <div className="relative flex h-20 w-20 items-center justify-center">
        <Image 
          src="/ghost-logo-v2.png" 
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
