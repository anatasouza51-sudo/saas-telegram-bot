"use client"

import { memo, useState, useCallback } from "react"
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

  return (
    <>
      {/* Top Navigation Bar - Mobile-optimized compact design */}
      <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md bg-slate-950/90 border-b border-blue-500/10 px-2 py-2 sm:px-4 sm:py-3 md:px-8 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          {/* Logo - Very compact on mobile */}
          <Link href="/" className="flex items-center gap-1 flex-shrink-0 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <Image
                src="/ghostbot-final-logo.png"
                alt="GhostBot"
                width={32}
                height={32}
                className="object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <span className="text-xs sm:text-sm md:text-base font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hidden sm:inline">
              GhostBot
            </span>
          </Link>

          {/* Center Navigation - Desktop Only */}
          <div className="hidden lg:flex items-center gap-0.5">
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

          {/* Right Section - Icons with proper spacing */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 ml-auto">
            {/* Search - Hidden on mobile */}
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

            {/* Notifications - Large icon on mobile */}
            <div className="flex items-center justify-center">
              <NotificationsPopover />
            </div>

            {/* Settings - Large icon on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/5 h-9 w-9 sm:h-8 sm:w-8"
              onClick={() => setProfileDialogOpen(true)}
              aria-label="Configurações de perfil"
            >
              <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
            </Button>

            {/* User Menu - Hidden on mobile, shown on md+ */}
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/5">
              <div className="flex flex-col items-end">
                <p className="text-xs font-medium text-white">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
              </div>
              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-[10px]">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Mobile Menu Toggle - Large on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-white/5 h-9 w-9"
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
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

      {/* Mobile Menu - Full height on mobile */}
      {mobileMenuOpen && (
        <div className="fixed top-[56px] left-0 right-0 z-40 backdrop-blur-md bg-slate-950/95 border-b border-blue-500/10 p-3 lg:hidden max-h-[calc(100vh-56px)] overflow-y-auto">
          <div className="space-y-1">
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
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            
            {/* Mobile User Info */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
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
