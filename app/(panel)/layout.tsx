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
    <div className="min-h-screen bg-slate-950">
      <TopNavBar user={user} />
      <MobileHeader />
      <main className="pt-14 md:pt-[73px]">
        {children}
      </main>
    </div>
  )
}
