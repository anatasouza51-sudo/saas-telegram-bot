import { requireUser } from "@/lib/session"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import type { ReactNode } from "react"
import { MobileHeader } from "@/components/mobile-header"

export default async function PanelLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await requireUser()

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0 bg-[#0a0a0a]">
        <MobileHeader />
        <div className="relative min-h-screen">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[100px] rounded-full" />
          </div>
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
