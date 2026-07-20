import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"

export default async function SignInPage() {
  const user = await getSessionUser()
  if (user) redirect("/")

  return (
    <main className="flex min-h-svh items-center justify-center bg-mesh p-4 relative overflow-hidden">
      {/* Simplified Background - Reduced animation complexity for better performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full flex justify-center">
        <AuthForm mode="sign-in" />
      </div>
    </main>
  )
}
