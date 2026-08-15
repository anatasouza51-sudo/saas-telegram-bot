"use client"

import { memo, useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { authClient } from "@/lib/auth-client"
import {
  Settings,
  LogOut,
  Bell
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Role } from "@/lib/roles"
import { NotificationsConnected } from "@/components/notifications-connected"
import { ProfileSettingsDialog } from "@/components/profile-settings-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"
import { useMobileMenu } from "@/components/mobile-menu-context"

export const TopNavBar = memo(({
  user,
}: {
  user: { name: string; email: string; role: Role; id: string; storeId: string; image?: string | null }
}) => {
  const router = useRouter()
  const { mobileMenuOpen, setMobileMenuOpen } = useMobileMenu()
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

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

  return (
    <>
      <header className="relative z-40 flex w-full shrink-0 items-center justify-between gap-4 border-0 bg-transparent p-0 px-4 pb-2 pt-4 shadow-none outline-none before:hidden after:hidden md:px-8 md:pb-3 md:pt-6">
        {/* Floating brand block, visually independent from the actions on the right. */}
        <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="GHOST BOT — Dashboard">
          <span className="relative flex size-12 items-center justify-center overflow-hidden md:size-14">
            <Image
              src="/ghostbot-final-logo.png"
              alt="GHOST BOT"
              width={48}
              height={48}
              className="size-10 object-contain md:size-12"
              priority
            />
          </span>
          <span className="whitespace-nowrap text-xl font-black leading-none tracking-[-0.04em] text-dashboard-text md:text-2xl">
            GHOST <span className="text-dashboard-accent">BOT</span>
          </span>
        </Link>

        {/* Individual floating actions, without a surrounding pill or card. */}
        <div className="flex items-center gap-1 md:gap-2">
          <NotificationsConnected />

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="dashboard-3d-control size-10 rounded-full border border-dashboard-border/60 bg-dashboard-surface/70 text-dashboard-text-muted hover:border-dashboard-accent/50 hover:bg-dashboard-surface hover:text-dashboard-text"
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
            "absolute inset-y-0 right-0 flex w-[min(88vw,320px)] flex-col border-l border-dashboard-border/50 bg-dashboard-sidebar shadow-2xl transition-transform duration-300 ease-out",
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="min-h-0 flex-1">
            <AppSidebar
              userRole={user.role}
              onItemClick={() => setMobileMenuOpen(false)}
              className="border-r-0"
            />
          </div>
          
          {/* Mobile Logout at bottom of sidebar */}
          <div className="shrink-0 border-t border-dashboard-border/30 bg-dashboard-sidebar px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 rounded-xl px-3 py-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
