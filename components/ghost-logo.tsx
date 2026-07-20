import Image from "next/image"

export function GhostLogo({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Simplified Glow Effect - removed heavy animation */}
      <div className="absolute inset-0 bg-primary/10 blur-lg rounded-full" />
      
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
