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
    <header className="flex flex-col gap-6 border-b border-white/5 bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">
            {section}
          </p>
          <h1 className="text-3xl font-black tracking-tighter text-white sm:text-4xl">
            {active?.title}
          </h1>
          {active?.description && (
            <p className="text-sm sm:text-base font-medium text-muted-foreground">
              {active.description}
            </p>
          )}
        </div>
      </div>

      {/* Navegação secundária com scroll horizontal e botões grandes */}
      <nav className="overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2.5 min-w-max">
          {tabs.map((tab) => {
            const Icon = ICONS[tab.icon]
            const isActive = tab.href === active?.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-tight transition-all active:scale-[0.96] whitespace-nowrap",
                  isActive
                    ? "bg-gradient-to-r from-primary to-blue-600 text-black shadow-xl shadow-primary/20"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white border border-white/5",
                )}
              >
                {Icon && <Icon className="h-4.5 w-4.5" />}
                {tab.title}
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
