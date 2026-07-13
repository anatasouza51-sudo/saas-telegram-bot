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

// Sticky section header with a row of tab links. Each tab is a real route, so
// navigation keeps server-side data fetching per page while the section looks
// like a single tabbed screen.
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
    <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6 md:py-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {section}
          </p>
          <h1 className="text-lg font-semibold text-foreground text-balance">
            {active?.title}
          </h1>
          {active?.description && (
            <p className="text-sm text-muted-foreground text-pretty">
              {active.description}
            </p>
          )}
        </div>
      </div>
      <nav className="flex flex-wrap gap-1" aria-label={section}>
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon]
          const isActive = tab.href === active?.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {tab.title}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
