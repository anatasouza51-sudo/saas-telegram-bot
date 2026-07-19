"use client"

import Image from "next/image"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"

export function MobileHeader() {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between px-6 md:hidden">
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]" />
      
      {/* Subtle Gradient Glow */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <button 
        onClick={toggleSidebar}
        className="group relative flex items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95"
      >
        <div className="relative">
          {/* Outer Glow for Logo */}
          <div className="absolute -inset-1 bg-primary/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <Image 
            src="/ghostbot-final-logo.png" 
            alt="GhostBot Logo" 
            width={38} 
            height={38} 
            className="relative object-contain drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]"
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
      </button>

      <div className="relative flex items-center gap-2">
        {/* Modern Trigger Container */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 transition-colors hover:bg-white/10 active:scale-90">
          <SidebarTrigger className="text-white scale-110" />
        </div>
      </div>
    </header>
  )
}
