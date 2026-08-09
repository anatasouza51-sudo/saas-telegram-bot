import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { GhostBg } from "@/components/ghost-bg"
import { AuthForm } from "@/components/auth-form"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const current = await getSessionUser()
  if (current) redirect("/")

  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ghost Background Animation */}
      <GhostBg />

      <div className="relative z-10 w-full flex justify-center">
        <AuthForm mode="sign-in" />
      </div>
    </main>
  )
}
