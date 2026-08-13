"use client"

import React, { memo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"
import { MAIN_NAV, SYSTEM_NAV, isSection, type NavItem } from "@/lib/nav"
import { canSee, type Role } from "@/lib/roles"
import { motion, AnimatePresence } from "framer-motion"

interface SidebarProps {
  userRole: Role
  className?: string
  onItemClick?: () => void
  alwaysExpanded?: boolean
}

export const AppSidebar = memo(({ userRole, className, onItemClick, alwaysExpanded = false }: SidebarProps) => {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    MAIN_NAV.forEach((node) => {
      if (isSection(node)) {
        const visible = node.children.filter((child) => canSee(userRole, child.capability))
        const isActive = visible.some((child) => pathname.startsWith(child.href))
        initial[node.title] = isActive || visible.length > 0
      }
    })
    return initial
  })

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href)

  const toggleSection = (title: string) => {
    if (alwaysExpanded) return
    setExpandedSections((previous) => ({ ...previous, [title]: !previous[title] }))
  }

  const renderIcon = (iconName: string, active: boolean, child = false) => {
    const Icon = (Icons as unknown as Record<string, LucideIcon>)[iconName]
    if (!Icon) return null
    return (
      <span className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
        child ? "size-8" : "size-9",
        active ? "bg-dashboard-accent/15 text-dashboard-accent" : "text-dashboard-text-muted group-hover:text-dashboard-text",
      )} aria-hidden="true">
        <Icon className={cn(child ? "size-[17px]" : "size-[18px]")} strokeWidth={1.9} />
      </span>
    )
  }

  const NavLink = ({ item, active, isChild = false }: { item: NavItem; active: boolean; isChild?: boolean }) => (
    <Link
      href={item.href}
      onClick={onItemClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-w-0 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-accent/60",
        active
          ? "bg-dashboard-accent/12 text-dashboard-text shadow-[inset_3px_0_0_theme(colors.dashboard.accent)]"
          : "text-dashboard-text-muted hover:bg-dashboard-surface-elevated hover:text-dashboard-text",
        isChild && "ml-3 w-[calc(100%-0.75rem)]",
      )}
    >
      {renderIcon(item.icon, active, isChild)}
      <span className="min-w-0 flex-1 truncate leading-5">{item.title}</span>
      {active && <span className="size-1.5 shrink-0 rounded-full bg-dashboard-accent shadow-[0_0_10px_theme(colors.dashboard.accent)]" aria-hidden="true" />}
    </Link>
  )

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-7 items-center px-2.5 pb-2 pt-1">
      <p className="truncate text-[10px] font-bold uppercase leading-4 tracking-[0.22em] text-dashboard-text-muted/60">
        {children}
      </p>
    </div>
  )

  return (
    <aside className={cn("flex min-h-0 h-full w-full min-w-0 flex-col bg-dashboard-sidebar text-dashboard-text", className)}>
      <div className="shrink-0 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] lg:px-5 lg:pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-dashboard-accent/80">Painel</p>
            <p className="mt-1 truncate text-xs font-medium text-dashboard-text-muted">Navegação principal</p>
          </div>
          <span className="size-2 shrink-0 rounded-full bg-dashboard-accent shadow-[0_0_12px_theme(colors.dashboard.accent)]" aria-hidden="true" />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5 lg:px-4" aria-label="Navegação do painel">
        <div className="space-y-6">
          <section aria-labelledby="sidebar-operation-label" className="space-y-1">
            <div id="sidebar-operation-label"><SectionLabel>Operação</SectionLabel></div>
            <div className="space-y-1">
              {MAIN_NAV.map((node, index) => {
                if (isSection(node)) {
                  const visibleChildren = node.children.filter((child) => canSee(userRole, child.capability))
                  if (visibleChildren.length === 0) return null
                  const sectionActive = visibleChildren.some((child) => isActive(child.href))
                  const isExpanded = expandedSections[node.title] ?? true

                  return (
                    <div key={node.title} className="space-y-1">
                      <button
                        type="button"
                        onClick={alwaysExpanded ? undefined : () => toggleSection(node.title)}
                        disabled={alwaysExpanded}
                        aria-expanded={alwaysExpanded || isExpanded}
                        className={cn(
                          "group flex min-w-0 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-accent/60",
                          sectionActive ? "text-dashboard-text" : "text-dashboard-text-muted hover:bg-dashboard-surface-elevated hover:text-dashboard-text",
                          alwaysExpanded && "cursor-default",
                        )}
                      >
                        {renderIcon(node.icon, sectionActive)}
                        <span className="min-w-0 flex-1 truncate text-left leading-5">{node.title}</span>
                        {!alwaysExpanded && (
                          <motion.span
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="flex size-6 shrink-0 items-center justify-center text-dashboard-text-muted/60"
                          >
                            <ChevronRight className="size-4" />
                          </motion.span>
                        )}
                      </button>
                      <AnimatePresence initial={false}>
                        {(alwaysExpanded || isExpanded) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-1 pb-1 pt-0.5">
                              {visibleChildren.map((child) => (
                                <NavLink key={child.href} item={child} active={isActive(child.href)} isChild />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                }
                if (!canSee(userRole, node.capability)) return null
                return <NavLink key={node.href || index} item={node} active={isActive(node.href)} />
              })}
            </div>
          </section>

          <section aria-labelledby="sidebar-system-label" className="space-y-1 border-t border-dashboard-border/40 pt-4">
            <div id="sidebar-system-label"><SectionLabel>Sistema</SectionLabel></div>
            <div className="space-y-1">
              {SYSTEM_NAV.map((item) => canSee(userRole, item.capability) && (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </div>
          </section>
        </div>
      </nav>
    </aside>
  )
})

AppSidebar.displayName = "AppSidebar"
