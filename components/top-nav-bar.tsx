"use client"

import { memo, useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  Search,
  Settings,
  Menu,
  X,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Megaphone,
  Send,
  Wallet,
  Users,
  ScrollText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ROLE_LABELS, type Role } from "@/lib/roles"
import { NotificationsPopover } from "@/components/notifications-popover"
import { ProfileSettingsDialog } from "@/components/profile-settings-dialog"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Produtos", href: "/products", icon: Package },
  { label: "Vendas", href: "/orders", icon: ShoppingCart },
  { label: "Divulgação", href: "/posts", icon: Megaphone },
  { label: "Telegram", href: "/telegram", icon: Send },
  { label: "Gateway", href: "/gateway", icon: Wallet },
  { label: "Clientes", href: "/customers", icon: Users },
  { label: "Logs", href: "/logs", icon: ScrollText },
]

export const TopNavBar = memo(({
  user,
}: {
  user: { name: string; email: string; role: Role; id: string; storeId: string }
}) => {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  const toggleMobileMenu = useCallback(() => setMobileMenuOpen(prev => !prev), [])
  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  // Bloqueia scroll quando menu está aberto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [mobileMenuOpen])

  return (
    <>
      {/* Top Navigation Bar — Compacta e responsiva */}
      <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md bg-slate-950/90 border-b border-blue-500/10 px-3 py-2 sm:px-4 sm:py-3 md:px-8 shadow-lg">
        <div className="flex items-center justify-between gap-2 h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 flex-shrink-0 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <Image
                src="/ghostbot-final-logo.png"
                alt="GhostBot"
                width={32}
                height={32}
                className="object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hidden sm:inline">
              GhostBot
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.slice(0, 5).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {/* Search — Hidden on mobile */}
            <div className={`hidden sm:flex items-center transition-all duration-300 ${searchOpen ? "w-40 md:w-56" : "w-8"}`}>
              {searchOpen ? (
                <div className="relative w-full">
                  <Input
                    type="search"
                    placeholder="Buscar..."
                    className="w-full bg-white/5 border-blue-500/20 text-white placeholder:text-muted-foreground focus:border-blue-500/40 focus:bg-white/10 text-xs h-8"
                    autoFocus
                    onBlur={closeSearch}
                  />
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openSearch}
                  className="hover:bg-white/5 h-8 w-8"
                >
                  <Search className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Notifications */}
            <NotificationsPopover />

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/5 h-8 w-8"
              onClick={() => setProfileDialogOpen(true)}
              aria-label="Configurações"
            >
              <Settings className="w-4 h-4" />
            </Button>

            {/* User Info — Desktop only */}
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/5">
              <div className="flex flex-col items-end text-right">
                <p className="text-xs font-medium text-white">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
              </div>
              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-white/5 h-8 w-8"
              onClick={toggleMobileMenu}
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Profile Settings Dialog */}
      <ProfileSettingsDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        user={user}
      />

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-slate-950/95 border-b border-blue-500/10 max-h-[calc(100vh-56px)] overflow-y-auto lg:hidden">
          <div className="px-3 py-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            {/* Mobile User Info */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{ROLE_LABELS[user.role]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
})
TopNavBar.displayName = "TopNavBar"
