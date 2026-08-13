"use client"

import React, { useState, useEffect } from "react"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const THEME_KEY = "ghostbot_theme"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true
    const stored = localStorage.getItem(THEME_KEY)
    return stored ? stored === "dark" : true
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add("dark")
      localStorage.setItem(THEME_KEY, "dark")
    } else {
      root.classList.remove("dark")
      localStorage.setItem(THEME_KEY, "light")
    }
  }, [isDark])

  const toggle = () => setIsDark((prev) => !prev)

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn(
        "size-10 rounded-full border border-dashboard-border/60 bg-dashboard-surface/70 text-dashboard-text-muted hover:border-dashboard-accent/50 hover:bg-dashboard-surface hover:text-dashboard-text transition-all duration-300",
        !isDark && "text-yellow-500 hover:text-yellow-400"
      )}
      aria-label={isDark ? "Modo claro" : "Modo escuro"}
    >
      {isDark ? (
        <Sun className="w-5 h-5 transition-transform duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-300 rotate-0 scale-100" />
      )}
    </Button>
  )
}
