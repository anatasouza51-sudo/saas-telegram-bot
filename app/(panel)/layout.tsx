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
      {/* Navbar fixa no topo */}
      <TopNavBar user={user} />
      <MobileHeader />
      
      {/* 
        Espaçamento superior para compensar a navbar fixa.
        h-14 (56px) no mobile, md:pt-[73px] no desktop.
      */}
      <main className="flex-1 pt-14 sm:pt-16 md:pt-[73px]">
        {children}
      </main>
    </div>
  )
}
