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

export function SectionHeader({
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
    <header className="sticky top-14 z-20 border-b border-white/5 bg-slate-950 lg:top-[73px]">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* Seção e Título */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
            {section}
          </p>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {active?.title}
            </h1>
            {active?.description && (
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                {active.description}
              </p>
            )}
          </div>
        </div>

        {/* Navegação secundária com scroll horizontal suave */}
        {tabs.length > 0 && (
          <nav className="overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2 min-w-max">
              {tabs.map((tab) => {
                const Icon = ICONS[tab.icon]
                const isActive = tab.href === active?.href
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] whitespace-nowrap",
                      isActive
                        ? "bg-gradient-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {tab.title}
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
