"use client"

import Image from "next/image"
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between px-6 md:hidden">
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]" />
      
      {/* Subtle Gradient Glow */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="group relative flex items-center gap-3 transition-all duration-300">
        <div className="relative animate-pulse-soft">
          <Image 
            src="/ghostbot-final-logo.png" 
            alt="GhostBot Logo" 
            width={38} 
            height={38} 
            className="relative object-contain"
          />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-base font-black tracking-tighter text-white uppercase italic">
            Ghost<span className="text-primary">Bot</span>
          </span>
          <span className="text-[10px] font-medium text-muted-foreground leading-none tracking-widest uppercase opacity-70">
            Ghost v2.5.0
          </span>
        </div>
      </div>
    </header>
  )
}
