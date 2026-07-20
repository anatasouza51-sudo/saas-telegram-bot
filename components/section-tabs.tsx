"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { NavItem } from "@/lib/nav"
import {
  Package,
  FolderTree,
  Boxes,
  ShoppingCart,
  Users,
  CreditCard,
  Truck,
  Megaphone,
  Images,
  Radio,
  Zap,
  type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  Package,
  FolderTree,
  Boxes,
  ShoppingCart,
  Users,
  CreditCard,
  Truck,
  Megaphone,
  Images,
  Radio,
  Zap,
}

export function SectionTabs({
  section,
  tabs,
}: {
  section: string
  tabs: NavItem[]
}) {
  const pathname = usePathname()
  const active =
    tabs.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`)) ??
    tabs[0]

  return (
    <header className="flex flex-col gap-4 border-b border-white/5 bg-slate-950 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
            {section}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {active?.title}
          </h1>
          {active?.description && (
            <p className="text-xs sm:text-sm font-medium text-muted-foreground/80">
              {active.description}
            </p>
          )}
        </div>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label={section}>
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon]
          const isActive = tab.href === active?.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all active:scale-[0.98]",
                isActive
                  ? "bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white",
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 w-4" />}
              {tab.title}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
