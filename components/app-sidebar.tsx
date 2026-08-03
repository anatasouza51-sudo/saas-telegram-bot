"use client"

import React, { memo } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { 
  ChevronRight,
  LayoutDashboard,
  type LucideIcon
} from "lucide-react"
import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"
import { MAIN_NAV, SYSTEM_NAV, isSection, type NavItem, type NavSection } from "@/lib/nav"
import { canSee, type Role } from "@/lib/roles"

interface SidebarProps {
  userRole: Role
  className?: string
  onItemClick?: () => void
}

export const AppSidebar = memo(({ userRole, className, onItemClick }: SidebarProps) => {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/" && pathname !== "/") return false
    return pathname.startsWith(href)
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
    <aside className={cn("flex flex-col bg-dashboard-sidebar border-r border-dashboard-border/50", className)}>
      {/* Logo Section */}
      <div className="p-6 mb-2">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 flex items-center justify-center bg-dashboard-surface rounded-xl border border-dashboard-border/30 group-hover:border-dashboard-accent/50 transition-colors duration-300 shadow-inner">
            <Image
              src="/ghostbot-final-logo.png"
              alt="GHOST BOT"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
          <span className="font-black text-base tracking-tight text-dashboard-text">
            GHOST <span className="text-dashboard-accent">BOT</span>
          </span>
        </Link>
      </div>

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

                return (
                  <div key={idx} className="space-y-1">
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-semibold text-dashboard-text-muted/80",
                      sectionActive && "text-dashboard-text"
                    )}>
                      {renderIcon(node.icon, sectionActive)}
                      <span>{node.title}</span>
                    </div>
                    <div className="space-y-1">
                      {visibleChildren.map((child, cIdx) => (
                        <NavLink 
                          key={cIdx} 
                          item={child} 
                          active={isActive(child.href)} 
                          isChild 
                        />
                      ))}
                    </div>
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
