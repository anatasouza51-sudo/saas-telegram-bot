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
        Ajustado para pt-16 (64px) no mobile para compensar a nova altura da navbar.
        md:pt-20 no desktop.
      */}
      <main className="flex-1 pt-16 sm:pt-18 md:pt-20">
        {children}
      </main>
    </div>
  )
}
