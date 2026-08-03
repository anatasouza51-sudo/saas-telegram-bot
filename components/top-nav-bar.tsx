"use client"

import { memo, useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { authClient } from "@/lib/auth-client"
import {
  Settings,
  Menu,
  X,
  LogOut,
  Bell
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROLE_LABELS, type Role } from "@/lib/roles"
import { NotificationsPopover } from "@/components/notifications-popover"
import { ProfileSettingsDialog } from "@/components/profile-settings-dialog"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"

export const TopNavBar = memo(({
  user,
}: {
  user: { name: string; email: string; role: Role; id: string; storeId: string; image?: string | null }
}) => {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  const toggleMobileMenu = useCallback(() => setMobileMenuOpen(prev => !prev), [])

  const handleSignOut = useCallback(async () => {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }, [router])

  // Mobile scroll lock
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileMenuOpen])

  // Get current page title from pathname
  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard"
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) return "Dashboard"
    
    // Simple mapping for common routes
    const titles: Record<string, string> = {
      products: "Produtos",
      categories: "Categorias",
      stock: "Estoque",
      orders: "Pedidos",
      customers: "Clientes",
      payments: "Pagamentos",
      deliveries: "Entregas",
      posts: "Postagens",
      channels: "Grupos & Canais",
      automations: "Automações",
      telegram: "Telegram Bot",
      gateway: "Gateway (VeoPag)",
      admins: "Administradores",
      logs: "Logs"
    }
    
    return titles[segments[0]] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
  }

  return (
    <>
      <header className="h-16 md:h-20 border-b border-dashboard-border/30 bg-dashboard-bg/80 backdrop-blur-xl sticky top-0 z-40 w-full px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Mobile Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-dashboard-text-muted hover:text-dashboard-text hover:bg-white/5"
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-sidebar"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Breadcrumb / Title */}
          <div className="flex flex-col">
            <h1 className="text-sm md:text-base font-bold text-dashboard-text tracking-tight">
              {getPageTitle()}
            </h1>
            <p className="hidden md:block text-[10px] text-dashboard-text-muted font-medium uppercase tracking-widest">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          <NotificationsPopover />

          <Button
            variant="ghost"
            size="icon"
            className="text-dashboard-text-muted hover:text-dashboard-text hover:bg-white/5"
            onClick={() => setProfileDialogOpen(true)}
            aria-label="Configurações de perfil"
          >
            <Settings className="w-5 h-5" />
          </Button>

          <div className="h-8 w-[1px] bg-dashboard-border/30 mx-1 hidden md:block" />

          {/* User Profile */}
          <div className="hidden md:flex items-center gap-3 pl-2">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-dashboard-text">{user.name}</span>
              <button 
                onClick={handleSignOut}
                className="text-[10px] text-dashboard-accent hover:text-dashboard-accent/80 font-bold transition-colors"
              >
                Sair
              </button>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-dashboard-accent to-dashboard-accent-secondary flex items-center justify-center text-white text-sm font-black shadow-lg shadow-dashboard-accent/20 overflow-hidden">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          
          {/* Mobile User Avatar */}
          <div className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-dashboard-accent to-dashboard-accent-secondary flex items-center justify-center text-white text-xs font-black overflow-hidden">
            {user.image ? (
              <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </header>

      {/* Profile Settings Dialog */}
      <ProfileSettingsDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        user={user}
      />

      {/* Mobile Sidebar Drawer */}
      <div 
        id="mobile-sidebar"
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "visible" : "invisible"
        )}
      >
        {/* Backdrop */}
        <div 
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileMenuOpen(false)}
        />
        
        {/* Sidebar Content */}
        <div 
          className={cn(
            "absolute top-0 left-0 bottom-0 w-[280px] bg-dashboard-sidebar transition-transform duration-300 ease-in-out shadow-2xl flex flex-col",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <AppSidebar 
            userRole={user.role} 
            onItemClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Mobile Logout at bottom of sidebar */}
          <div className="mt-auto border-t border-dashboard-border/30 bg-dashboard-sidebar">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 p-4"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              <span className="font-bold">Encerrar Sessão</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
})

TopNavBar.displayName = "TopNavBar"
