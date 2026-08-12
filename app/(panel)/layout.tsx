import { requireUser } from "@/lib/session"
import type { ReactNode } from "react"
import { TopNavBar } from "@/components/top-nav-bar"
import { AppSidebar } from "@/components/app-sidebar"
import { PageTransition } from "@/components/page-transition"
import { ErrorView } from "@/components/error-view"
import OnboardingTutorial from "@/components/onboarding-tutorial"
import { MobileMenuProvider } from "@/components/mobile-menu-context"
import { MobilePanelNav } from "@/components/mobile-panel-nav"

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
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.stack?.includes("redirect"))) {
      throw e
    }
    
    console.error("[PanelLayout] Auth failed:", e)
    return (
      <div className="min-h-screen bg-dashboard-bg text-dashboard-text flex items-center justify-center p-6">
        <ErrorView 
          title="Painel Indisponível"
          message="Não foi possível validar sua sessão de acesso. O banco de dados pode estar temporariamente fora do ar."
          retryHref="/"
        />
      </div>
    )
  }

  return (
    <MobileMenuProvider>
      <div className="min-h-screen bg-dashboard-bg text-dashboard-text flex overflow-hidden">
      {/* Sidebar Fixa Desktop */}
      <AppSidebar
        userRole={user.role}
        alwaysExpanded
        className="hidden lg:flex w-[260px] shrink-0 sticky top-0 h-screen"
      />

      {/* Área de Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Topbar */}
        <TopNavBar user={user} />

        {/* Conteúdo Principal com Scroll */}
        <main className="flex-1 overflow-y-auto scroll-smooth relative bg-grain">
          <div className="container mx-auto p-4 pb-32 md:p-8 md:pb-32 max-w-7xl lg:pb-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>

        <MobilePanelNav />
      </div>

      {/* Tutorial de Onboarding */}
        <OnboardingTutorial />
      </div>
    </MobileMenuProvider>
  )
}
