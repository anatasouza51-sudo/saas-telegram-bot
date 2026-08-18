"use client"

import { FormEvent, useState } from "react"
import { AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react"
import { authClient } from "@/lib/auth-client"

export function AdminLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/admin",
    })

    if (result.error) {
      setError("Não foi possível autenticar esta sessão administrativa.")
      setIsLoading(false)
      return
    }

    window.location.href = "/admin"
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div className="space-y-2">
        <label htmlFor="admin-email" className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">E-mail administrativo</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-[3.25rem] w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-admin-lime/60 focus:bg-black/30 focus:ring-2 focus:ring-admin-lime/15" placeholder="admin@empresa.com" />
      </div>

      <div className="space-y-2">
        <label htmlFor="admin-password" className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">Senha</label>
        <div className="relative">
          <input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-[3.25rem] w-full rounded-2xl border border-white/10 bg-black/20 px-4 pr-12 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-admin-lime/60 focus:bg-black/30 focus:ring-2 focus:ring-admin-lime/15" placeholder="Digite sua senha" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-white/40 transition-colors hover:text-white" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-2xl border border-admin-copper/30 bg-admin-copper/10 px-3 py-3 text-xs leading-5 text-admin-copper"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span></div>}

      <button type="submit" disabled={isLoading} className="flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-admin-lime px-5 text-sm font-black text-admin-ink transition-[transform,box-shadow,opacity] hover:shadow-[0_12px_30px_rgba(180,217,133,0.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><KeyRound className="h-4 w-4" /> ENTRAR NO CONTROL PLANE <ArrowRight className="h-4 w-4" /></>}
      </button>

      <p className="flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-white/35"><ShieldCheck className="h-3.5 w-3.5 text-admin-lime/80" /> Apenas administradores da plataforma podem continuar.</p>
    </form>
  )
}
