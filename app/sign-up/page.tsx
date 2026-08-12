import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"
import { GhostBg } from "@/components/ghost-bg"

export const dynamic = "force-dynamic"

export default async function SignUpPage() {
  const current = await getSessionUser()
  if (current) redirect("/")

  return (
    <main className="relative isolate min-h-svh w-full overflow-x-hidden bg-[#090713] text-white font-sans">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(168,85,247,0.42),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(236,72,153,0.2),transparent_30%),linear-gradient(135deg,rgba(9,7,19,0.92),rgba(22,10,40,0.72),rgba(5,4,11,0.96))]" />
      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <GhostBg />

      <div className="relative z-10 flex min-h-svh w-full items-start justify-center px-3 py-4 sm:items-center sm:px-8 sm:py-8 lg:px-12">
        <AuthForm mode="sign-up" />
      </div>
    </main>
  )
}
