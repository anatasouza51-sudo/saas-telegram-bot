import { requireUser } from "@/lib/session"
import type { ReactNode } from "react"

export const dynamic = "force-dynamic"

export default async function PanelLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await requireUser()

  return (
    <div>
      <p>User: {user.name} ({user.email})</p>
      {children}
    </div>
  )
}
