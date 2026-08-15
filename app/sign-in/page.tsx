import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { GhostBg } from "@/components/ghost-bg"
import { AuthForm } from "@/components/auth-form"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const current = await getSessionUser()
  if (current) redirect("/")

  return (
    <main className="relative isolate min-h-screen w-full overflow-hidden bg-dashboard-bg text-white font-sans">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(169,201,127,0.18),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(209,125,85,0.16),transparent_30%),linear-gradient(135deg,rgba(17,24,19,0.96),rgba(30,40,27,0.78),rgba(9,14,11,0.98))]" />
      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <GhostBg />

      <div className="relative z-10 flex min-h-[100svh] w-full items-start justify-center px-4 py-4 sm:min-h-screen sm:items-center sm:px-8 sm:py-8 lg:px-12">
        <AuthForm mode="sign-in" />
      </div>
    </main>
  )
}
