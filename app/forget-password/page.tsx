"use client"

import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, ArrowLeft } from "lucide-react"
import { GhostLogo } from "@/components/ghost-logo"

export default function ForgetPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await authClient.forgetPassword({
        email,
        redirectTo: "/reset-password",
      })
      if (error) throw new Error(error.message || "Falha ao enviar email")
      setSuccess(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-[440px] px-4 py-8">
        <div className="mb-10 flex flex-col items-center text-center">
          <GhostLogo className="mb-6" />
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Recuperar senha
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-[360px]">
            {success 
              ? "Se o email estiver cadastrado, você receberá um link para redefinir sua senha em instantes."
              : "Informe seu email e enviaremos as instruções para você criar uma nova senha."}
          </p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[22px] blur opacity-20 group-hover:opacity-30 transition duration-1000" />
          
          <div className="relative flex flex-col gap-5 rounded-[20px] border border-white/10 bg-card/90 p-8 shadow-2xl">
            {!success ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70 ml-1">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="pl-10 h-12 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 mt-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold text-base rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" 
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Enviar link de recuperação"
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 border border-success/20 text-success mb-4">
                  <Mail className="h-6 w-6" />
                </div>
                <p className="text-white font-medium">Email enviado!</p>
                <p className="text-sm text-muted-foreground mt-2">Verifique sua caixa de entrada e spam.</p>
              </div>
            )}

            <Link
              href="/sign-in"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
