import { requireUser } from "@/lib/session"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import type { ReactNode } from "react"

export default async function PanelLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await requireUser()

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  )
}
