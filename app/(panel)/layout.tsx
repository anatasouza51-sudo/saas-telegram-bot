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
    <div className="pt-[73px]">
      <TopNavBar user={user} />
      <MobileHeader />
      <main>
        {children}
      </main>
    </div>
  )
}
