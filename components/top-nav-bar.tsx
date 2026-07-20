"use client"

import { memo, useState, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  Search,
  Bell,
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
  user: { name: string; email: string; role: Role }
}) => {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const toggleMobileMenu = useCallback(() => setMobileMenuOpen(prev => !prev), [])
  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  return (
    <>
      {/* Top Navigation Bar - Reduced blur and shadow for performance */}
      <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md bg-slate-950/90 border-b border-blue-500/10 px-4 md:px-8 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Image
                src="/ghostbot-final-logo.png"
                alt="GhostBot"
                width={40}
                height={40}
                className="object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hidden md:inline">
              GhostBot
            </span>
          </Link>

          {/* Center Navigation - Desktop */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.slice(0, 5).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Search */}
            <div className={`hidden md:flex items-center transition-all duration-300 ${searchOpen ? "w-64" : "w-10"}`}>
              {searchOpen ? (
                <div className="relative w-full">
                  <Input
                    type="search"
                    placeholder="Buscar..."
                    className="w-full bg-white/5 border-blue-500/20 text-white placeholder:text-muted-foreground focus:border-blue-500/40 focus:bg-white/10"
                    autoFocus
                    onBlur={closeSearch}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openSearch}
                  className="hover:bg-white/5"
                >
                  <Search className="w-5 h-5" />
                </Button>
              )}
            </div>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/5 relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/5"
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-white/5"
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-white/5">
              <div className="flex flex-col items-end">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-[73px] left-0 right-0 z-40 backdrop-blur-md bg-slate-950/95 border-b border-blue-500/10 p-4 lg:hidden">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
})
TopNavBar.displayName = "TopNavBar"
