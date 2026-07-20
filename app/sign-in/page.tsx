import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"

export default async function SignInPage() {
  const user = await getSessionUser()
  if (user) redirect("/")

  return (
    <main className="flex min-h-svh items-center justify-center bg-mesh p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Animated Particles/Dots */}
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-20" />
        <div className="absolute top-3/4 left-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-bounce opacity-20" style={{ animationDuration: '3s' }} />
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-accent rounded-full animate-ping opacity-20" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full flex justify-center animate-in-up">
        <AuthForm mode="sign-in" />
      </div>
    </main>
  )
}
