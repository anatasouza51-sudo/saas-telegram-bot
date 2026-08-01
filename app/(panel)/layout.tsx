import { requireUser } from "@/lib/session"
import type { ReactNode } from "react"
import { TopNavBar } from "@/components/top-nav-bar"
import { ErrorView } from "@/components/error-view"

export const dynamic = "force-dynamic"

export default async function PanelLayout({
  children,
}: {
  children: ReactNode
}) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    // Re-throw redirects so Next.js can handle them
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) {
      throw e
    }
    
    console.error("[PanelLayout] Auth failed:", e)
    return (
      <div className="min-h-screen bg-[#05070a] text-zinc-100 flex items-center justify-center p-6">
        <ErrorView 
          title="Painel Indisponível"
          message="Não foi possível validar sua sessão de acesso. O banco de dados pode estar temporariamente fora do ar."
          retryHref="/"
        />
      </div>
    )
  }

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
