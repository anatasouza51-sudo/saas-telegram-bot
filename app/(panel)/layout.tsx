import { requireUser } from "@/lib/session"
import type { ReactNode } from "react"
import { Sidebar } from "@/components/sidebar"

export const dynamic = "force-dynamic"

export default async function PanelLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireUser()

  return (
    <div className="min-h-screen bg-[#05070a] text-zinc-100 flex">
      {/* Barra lateral fixa com ícones */}
      <Sidebar />

      {/* Conteúdo principal */}
      <main className="flex-1 p-2 sm:p-4 md:p-8 overflow-x-hidden w-full">
        {children}
      </main>
    </div>
  )
}
