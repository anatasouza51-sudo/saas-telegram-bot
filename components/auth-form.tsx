"use client"

import type React from "react"
import { useState, useCallback, memo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react"
import { GhostLogo } from "@/components/ghost-logo"

const FormInput = memo(({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  minLength,
  rightElement,
}: any) => (
  <div className="space-y-2">
    <div className="ml-1 flex items-center justify-between">
      <Label htmlFor={id} className="font-space text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
        {label}
      </Label>
      {rightElement}
    </div>
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />}
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className={`${Icon ? "pl-11" : "px-4"} ${rightElement ? "pr-11" : ""} h-12 rounded-xl border-white/15 bg-white/[0.07] text-sm text-white shadow-inner shadow-black/10 transition-all placeholder:text-white/30 focus:border-fuchsia-300/70 focus:bg-white/[0.11] focus:ring-2 focus:ring-fuchsia-300/20`}
      />
    </div>
  </div>
))
FormInput.displayName = "FormInput"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isSignUp = mode === "sign-up"

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isSignUp && password !== confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    setLoading(true)

    try {
      let result: any

      if (isSignUp) {
        result = await authClient.signUp.email({
          email,
          password,
          name,
          callbackURL: "/",
        }, {
          onSuccess: () => {
            window.location.href = "/"
          },
          onError: (ctx) => {
            setError(ctx.error.message || "Falha ao criar conta")
            setLoading(false)
          },
        })
        if (result?.error) {
          setError(result.error.message || "Falha ao criar conta")
          setLoading(false)
          return
        }
      } else {
        result = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/",
        }, {
          onSuccess: () => {
            window.location.href = "/"
          },
          onError: (ctx) => {
            setError(ctx.error.message || "Credenciais inválidas")
            setLoading(false)
          },
        })
        if (result?.error) {
          setError(result.error.message || "Credenciais inválidas")
          setLoading(false)
          return
        }
      }

      window.location.href = "/"
    } catch (err) {
      console.error("Auth error:", err)
      setError("Erro de sistema. Tente novamente.")
      setLoading(false)
    }
  }, [isSignUp, email, password, confirmPassword, name, router])

  const togglePassword = useCallback(() => setShowPassword((prev) => !prev), [])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 sm:gap-10">
      <section className="w-full max-w-2xl px-2 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1.5 font-space text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-100/80 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
          Operação Ghost online
        </div>
        <div className="mb-6 flex flex-col items-center gap-3">
          <GhostLogo className="h-16 w-16" />
          <div>
            <p className="font-space text-xs font-bold uppercase tracking-[0.24em] text-white/45">Central de comando</p>
            <h1 className="motion-safe:animate-bounce-slow motion-reduce:animate-none font-space text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
              GHOST <span className="text-fuchsia-300 drop-shadow-[0_0_22px_rgba(232,121,249,0.45)]">BOT</span>
            </h1>
          </div>
        </div>
        <p className="mx-auto max-w-2xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
          Automatize suas vendas no Telegram com um painel rápido, seguro e feito para escalar sua operação.
        </p>
      </section>

      <section className="w-full max-w-[440px]">
        <div className="auth-panel-shell relative rounded-[2rem] p-px">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="auth-border-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.45" />
              </linearGradient>
            </defs>
            <rect
              x="1"
              y="1"
              width="98"
              height="98"
              rx="8"
              fill="none"
              pathLength={100}
              stroke="#e9d5ff"
              strokeOpacity="0.18"
              strokeWidth="0.7"
            />
            <rect
              className="auth-border-orbit"
              x="1"
              y="1"
              width="98"
              height="98"
              rx="8"
              fill="none"
              pathLength={100}
              stroke="url(#auth-border-gradient)"
              strokeDasharray="10 90"
              strokeLinecap="butt"
              strokeWidth="0.8"
            />
          </svg>
          <form
            onSubmit={handleSubmit}
            className="relative z-[1] overflow-hidden rounded-[2rem] border border-fuchsia-200/25 bg-[#160c28]/70 p-6 shadow-[0_24px_90px_-28px_rgba(168,85,247,0.75)] backdrop-blur-2xl sm:p-8"
          >
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative">
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-space text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-100/60">
                  {isSignUp ? "Novo operador" : "Acesso restrito"}
                </span>
                <ShieldCheck className="h-4 w-4 text-emerald-200/70" />
              </div>
              <h2 className="font-space text-3xl font-black tracking-[-0.04em] text-white">
                {isSignUp ? "Comece sua operação" : "Bem-vindo de volta"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/50">
                {isSignUp ? "Crie seu acesso e coloque seu bot para trabalhar." : "Entre no seu centro de comando e continue de onde parou."}
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {isSignUp && (
                <FormInput id="name" label="Nome completo" icon={User} value={name} onChange={setName} placeholder="Seu nome" required />
              )}
              <FormInput id="email" label="E-mail" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" required />
              <FormInput
                id="password"
                label="Senha"
                icon={Lock}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                minLength={8}
                required
                rightElement={
                  <div className="flex items-center gap-3">
                    {!isSignUp && <Link href="/forget-password" className="font-space text-[10px] font-bold uppercase tracking-wider text-fuchsia-200 hover:text-white">Recuperar</Link>}
                    <button
                      type="button"
                      onClick={togglePassword}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="text-white/40 transition-colors hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                }
              />
              {isSignUp && (
                <FormInput id="confirmPassword" label="Confirmar senha" icon={Lock} type={showPassword ? "text" : "password"} value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" minLength={8} required />
              )}
            </div>

            {error && <div role="alert" className="mt-5 rounded-xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-xs font-medium leading-5 text-red-100">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-300 px-4 py-3.5 font-space text-sm font-black uppercase tracking-wider text-[#160c28] shadow-[0_12px_30px_-10px_rgba(232,121,249,0.9)] transition-all hover:brightness-110 hover:shadow-[0_16px_36px_-10px_rgba(232,121,249,0.95)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  {isSignUp ? "Criar meu acesso" : "Entrar no painel"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>

            <div className="mt-6 text-center text-xs text-white/45">
              {isSignUp ? (
                <>Já tem conta? <Link href="/sign-in" className="font-bold text-fuchsia-100 transition-colors hover:text-white">Entrar</Link></>
              ) : (
                <>Ainda não tem conta? <Link href="/sign-up" className="font-bold text-fuchsia-100 transition-colors hover:text-white">Criar conta gratuita</Link></>
              )}
            </div>
          </div>
          </form>
        </div>
        <p className="mt-4 text-center font-space text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">Seu dinheiro vai direto pro gateway — sem retenção.</p>
      </section>
    </div>
  )
}
