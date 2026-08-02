import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"

export const dynamic = "force-dynamic"

export default async function SignUpPage() {
  const current = await getSessionUser()
  if (current) redirect("/")

  return (
    <main className="min-h-screen w-full bg-[#050508] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Efeito de Fundo Estrelado - Igual à tela de login */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: `radial-gradient(circle at center, #ffffff 1px, transparent 1px)`, backgroundSize: '24px 24px' }}
      />

      <div className="relative z-10 w-full flex justify-center">
        <AuthForm mode="sign-up" />
      </div>
    </main>
  )
}
