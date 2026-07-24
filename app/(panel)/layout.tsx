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

      {/* Conteúdo principal empurrado para a direita (ml-16) */}
      <main className="flex-1 ml-16 p-4 md:p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
