"use client"

import { memo, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Bell } from "lucide-react"
import type { Role } from "@/lib/roles"
import { NotificationsConnected } from "@/components/notifications-connected"
import { ThemeToggle } from "@/components/theme-toggle"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"
import { useMobileMenu } from "@/components/mobile-menu-context"

export const TopNavBar = memo(({
  user,
}: {
  user: { name: string; email: string; role: Role; id: string; storeId: string; ownerId: string | null; image?: string | null }
}) => {
  const { mobileMenuOpen, setMobileMenuOpen } = useMobileMenu()
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
      <header className="sticky top-0 z-40 flex w-full shrink-0 items-center justify-between gap-4 border-0 bg-transparent p-0 px-4 pb-2 pt-4 shadow-none outline-none before:hidden after:hidden md:px-8 md:pb-3 md:pt-6">
        {/* DYNORBOT brand, replacing the previous Ghost Bot mark while preserving the topbar actions. */}
        <Link href="/" className="group flex h-12 w-[148px] shrink-0 items-center md:h-14 md:w-[208px]" aria-label="DYNORBOT — Dashboard">
          <Image
            src="/dynorbot-logo-clean-alpha.png"
            alt="DYNORBOT"
            width={208}
            height={82}
            className="h-auto max-h-full w-full object-contain object-left"
            priority
          />
        </Link>

        {/* Individual floating actions, without a surrounding pill or card. */}
        <div className="flex items-center gap-1 md:gap-2">
          <NotificationsConnected />

          <ThemeToggle />


        </div>
      </header>

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
              isTenantOwner={user.ownerId === null}
              onItemClick={() => setMobileMenuOpen(false)}
              className="border-r-0"
            />
          </div>
          
        </div>
      </div>
    </>
  )
})

TopNavBar.displayName = "TopNavBar"
