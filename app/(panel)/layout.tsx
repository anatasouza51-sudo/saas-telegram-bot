import { requireUser } from "@/lib/session"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import type { ReactNode } from "react"
import { Bot } from "lucide-react"

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
        <header className="flex h-16 items-center gap-3 border-b border-white/5 bg-black/20 px-6 backdrop-blur-xl md:hidden">
          <SidebarTrigger className="text-primary" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">GhostBot</span>
          </div>
        </header>
        <div className="relative min-h-screen">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
          </div>
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
