"use client"

import React, { memo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  type LucideIcon
} from "lucide-react"
import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"
import { MAIN_NAV, SYSTEM_NAV, isSection, type NavItem, type NavSection } from "@/lib/nav"
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
    // Default: expand sections that have the current page active
    const initial: Record<string, boolean> = {}
    MAIN_NAV.forEach((node) => {
      if (isSection(node)) {
        const visible = node.children.filter((c) => canSee(userRole, c.capability))
        const isActive = visible.some((c) => pathname.startsWith(c.href))
        initial[node.title] = isActive || visible.length > 0
      }
    })
    return initial
  })

  const isActive = (href: string) => {
    if (href === "/" && pathname !== "/") return false
    return pathname.startsWith(href)
  }

  const toggleSection = (title: string) => {
    if (alwaysExpanded) return
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const renderIcon = (iconName: string, active: boolean) => {
    const Icon = (Icons as any)[iconName] as LucideIcon
    if (!Icon) return null
    return (
      <Icon 
        className={cn(
          "w-4 h-4 transition-colors duration-200 shrink-0",
          active ? "text-white" : "text-dashboard-text-muted group-hover:text-dashboard-text"
        )} 
      />
    )
  }

  const NavLink = ({ item, active, isChild = false }: { item: NavItem, active: boolean, isChild?: boolean }) => (
    <Link
      href={item.href}
      onClick={onItemClick}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative overflow-hidden",
        active 
          ? "bg-gradient-to-r from-dashboard-accent to-dashboard-accent-secondary text-white shadow-lg shadow-dashboard-accent/20" 
          : "text-dashboard-text-muted hover:text-dashboard-text hover:bg-white/5",
        isChild && "ml-4"
      )}
    >
      {renderIcon(item.icon, active)}
      <span className="relative z-10">{item.title}</span>
      {active && (
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </Link>
  )

  return (
    <aside className={cn("flex flex-col h-full bg-dashboard-sidebar border-r border-dashboard-border/50", className)}>
      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-6 overflow-y-auto scrollbar-hide pb-8">
        {/* Operação Section */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-dashboard-text-muted/50 mb-3">
            Operação
          </p>
          <div className="space-y-1">
            {MAIN_NAV.map((node, idx) => {
              if (isSection(node)) {
                const visibleChildren = node.children.filter(child => canSee(userRole, child.capability))
                if (visibleChildren.length === 0) return null
                
                const sectionActive = visibleChildren.some(child => isActive(child.href))
                const isExpanded = expandedSections[node.title] ?? true

                return (
                  <div key={idx} className="space-y-1">
                    <button
                      type="button"
                      onClick={alwaysExpanded ? undefined : () => toggleSection(node.title)}
                      disabled={alwaysExpanded}
                      aria-expanded={alwaysExpanded || isExpanded}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2 text-sm font-semibold transition-all duration-200 rounded-lg",
                        !alwaysExpanded && "hover:bg-white/5",
                        sectionActive ? "text-dashboard-text" : "text-dashboard-text-muted/80",
                        alwaysExpanded && "cursor-default"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {renderIcon(node.icon, sectionActive)}
                        <span>{node.title}</span>
                      </div>
                      {!alwaysExpanded && (
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-dashboard-text-muted/50" />
                        </motion.div>
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {(alwaysExpanded || isExpanded) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-1 pt-1 pb-2">
                            {visibleChildren.map((child, cIdx) => (
                              <NavLink 
                                key={cIdx} 
                                item={child} 
                                active={isActive(child.href)} 
                                isChild 
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              }

              if (!canSee(userRole, node.capability)) return null
              return (
                <NavLink 
                  key={idx} 
                  item={node} 
                  active={isActive(node.href)} 
                />
              )
            })}
          </div>
        </div>

        {/* Sistema Section */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-dashboard-text-muted/50 mb-3">
            Sistema
          </p>
          <div className="space-y-1">
            {SYSTEM_NAV.map((item, idx) => {
              if (!canSee(userRole, item.capability)) return null
              return (
                <NavLink 
                  key={idx} 
                  item={item} 
                  active={isActive(item.href)} 
                />
              )
            })}
          </div>
        </div>
      </nav>
    </aside>
  )
})

AppSidebar.displayName = "AppSidebar"
