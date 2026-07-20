import { requireUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const user = await requireUser()
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Hello, {user.name}</p>
    </div>
  )
}
