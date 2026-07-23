"use client"

import { memo, useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { authClient } from "@/lib/auth-client"
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
  LogOut,
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
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  const toggleMobileMenu = useCallback(() => setMobileMenuOpen(prev => !prev), [])

  const handleSignOut = useCallback(async () => {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }, [router])
  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

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
      {/* Top Navigation Bar — Aumentada para h-16 (64px) no mobile e h-20 no desktop */}
      <nav className="fixed top-0 left-0 right-0 z-[100] h-16 sm:h-18 md:h-20 backdrop-blur-md bg-slate-950/90 border-b border-blue-500/10 px-4 sm:px-6 md:px-10 shadow-lg flex items-center">
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Logo - Aumentado */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Image
                src="/ghostbot-final-logo.png"
                alt="GHOST BOT"
                width={40}
                height={40}
                className="object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className="text-sm sm:text-base md:text-lg font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-wide">
              GHOST BOT
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            {NAV_ITEMS.slice(0, 5).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors duration-150 ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Right Section - Ícones maiores */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <NotificationsPopover />

            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/5 h-10 w-10 sm:h-11 sm:w-11"
              onClick={() => setProfileDialogOpen(true)}
              aria-label="Configurações"
            >
              <Settings className="w-6 h-6 sm:w-5 sm:h-5" />
            </Button>

            {/* Mobile Menu Toggle - Ícone bem grande */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-white/5 h-10 w-10"
              onClick={toggleMobileMenu}
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-7 h-7" />
              ) : (
                <Menu className="w-7 h-7" />
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
          className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-md lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu — Começa abaixo da nova altura da navbar (top-16) */}
      {mobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 z-[95] bg-slate-950 border-b border-blue-500/10 max-h-[calc(100vh-64px)] overflow-y-auto lg:hidden animate-in slide-in-from-top duration-300 shadow-2xl">
          <div className="px-4 py-4 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-4 px-4 py-4 rounded-xl text-base font-bold transition-colors duration-150 ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-6 h-6 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            {/* Mobile User Info */}
            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between gap-4 px-4 py-2">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-lg shadow-blue-500/20">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-white truncate">{user.name}</p>
                    <p className="text-xs font-medium text-muted-foreground truncate uppercase tracking-widest">{ROLE_LABELS[user.role]}</p>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSignOut}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-12 w-12"
                >
                  <LogOut className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
})
TopNavBar.displayName = "TopNavBar"
