import { requireUser } from "@/lib/session"
import type { ReactNode } from "react"
import { TopNavBar } from "@/components/top-nav-bar"

export const dynamic = "force-dynamic"

export default async function PanelLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="min-h-screen bg-[#05070a] text-zinc-100 flex flex-col">
      {/* Barra de navegação superior fixa */}
      <TopNavBar user={user} />

      {/* Conteúdo principal */}
      <main className="flex-1 pt-20 sm:pt-[88px] md:pt-24 px-2 sm:px-4 md:px-8 pb-2 sm:pb-4 md:pb-8 overflow-x-hidden w-full">
        {children}
      </main>
    </div>
  )
}
