import type { ReactNode } from "react"
import { SectionTabs } from "@/components/section-tabs"
import { sectionTabs, canSee } from "@/lib/nav"
import { getSessionUser } from "@/lib/session"

export default async function CatalogLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getSessionUser()
  const role = user?.role ?? "support"
  const tabs = sectionTabs("Catálogo").filter((t) => canSee(role, t.capability))

  return (
    <>
      <SectionTabs section="Catálogo" tabs={tabs} />
      {children}
    </>
  )
}
