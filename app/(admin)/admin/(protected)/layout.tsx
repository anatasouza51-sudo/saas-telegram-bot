import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { AdminShell } from "@/components/admin-shell"
import { getSessionUser } from "@/lib/session"
import { isPlatformAdmin } from "@/lib/platform-admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()

  if (!user) {
    redirect("/admin/login")
  }

  if (!isPlatformAdmin(user)) {
    redirect("/admin/forbidden")
  }

  return <AdminShell user={{ name: user.name, email: user.email }}>{children}</AdminShell>
}
