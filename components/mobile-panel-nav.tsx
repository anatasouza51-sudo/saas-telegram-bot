"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, Boxes, LayoutDashboard, Wallet, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMobileMenu } from "@/components/mobile-menu-context"

const items = [
  { label: "Início", href: "/", icon: LayoutDashboard },
  { label: "Bot", href: "/telegram", icon: Bot },
  { label: "Fluxos", href: "/automations", icon: Zap },
  { label: "Gateway", href: "/gateway", icon: Wallet },
]

export function MobilePanelNav() {
  const pathname = usePathname()
  const { mobileMenuOpen, toggleMobileMenu } = useMobileMenu()

  return (
    <nav
      className="fixed inset-x-3 z-40 flex items-center justify-around rounded-[22px] border border-dashboard-border bg-dashboard-sidebar/95 px-1.5 pt-2 shadow-2xl shadow-black/30 backdrop-blur-xl lg:hidden"
      style={{
        bottom: "max(0.75rem, env(safe-area-inset-bottom))",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
      }}
      aria-label="Navegação principal mobile"
    >
      {items.map(({ label, href, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
              isActive
                ? "text-dashboard-accent"
                : "text-dashboard-text-muted hover:bg-dashboard-surface-elevated hover:text-dashboard-text",
            )}
          >
            <Icon className="h-[19px] w-[19px]" />
            <span>{label}</span>
          </Link>
        )
      })}

      <button
        type="button"
        onClick={toggleMobileMenu}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
          mobileMenuOpen
            ? "bg-dashboard-surface-elevated text-dashboard-text"
            : "text-dashboard-text-muted hover:bg-dashboard-surface-elevated hover:text-dashboard-text",
        )}
        aria-label="Abrir todas as sessões"
        aria-haspopup="dialog"
        aria-expanded={mobileMenuOpen}
      >
        <Boxes className="h-[19px] w-[19px]" />
        <span>Mais</span>
      </button>
    </nav>
  )
}
