import { requireUser } from "@/lib/session"
import type { ReactNode } from "react"
import { TopNavBar } from "@/components/top-nav-bar"
import { MobileHeader } from "@/components/mobile-header"

export const dynamic = "force-dynamic"

export default async function PanelLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <TopNavBar user={user} />
      <MobileHeader />
      
      {/* 
        Ajustado para compensar a nova navbar flutuante (altura + margem do topo).
      */}
      <main className="flex-1 pt-20 sm:pt-[88px] md:pt-24">
        {children}
      </main>
    </div>
  )
}
