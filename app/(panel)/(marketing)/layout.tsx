import type { ReactNode } from "react"
import { SectionTabs } from "@/components/section-tabs"
import { sectionTabs, canSee } from "@/lib/nav"
import { getSessionUser } from "@/lib/session"

export default async function MarketingLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getSessionUser()
  const role = user?.role ?? "support"
  const tabs = sectionTabs("Divulgação").filter((t) =>
    canSee(role, t.capability),
  )

  return (
    <>
      <SectionTabs section="Divulgação" tabs={tabs} />
      {children}
    </>
  )
}
