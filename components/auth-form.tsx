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
  inputRightElement,
}: any) => (
  <div className="space-y-1 sm:space-y-2">
    <div className="ml-1 flex items-center justify-between">
      <Label htmlFor={id} className="font-space text-[9px] font-bold uppercase tracking-[0.16em] text-white/55 sm:text-[10px] sm:tracking-[0.18em]">
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
        className={`${Icon ? "pl-11" : "px-4"} ${inputRightElement ? "pr-11" : ""} h-12 rounded-xl sm:h-14 border-white/15 bg-white/[0.07] text-sm text-white shadow-inner shadow-black/10 transition-all placeholder:text-white/30 focus:border-dashboard-accent/70 focus:bg-white/[0.11] focus:ring-2 focus:ring-dashboard-accent/20`}
      />
      {inputRightElement && (
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
          {inputRightElement}
        </div>
      )}
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
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 sm:gap-12">
      <section className="w-full max-w-3xl px-3 text-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <GhostLogo className="h-16 w-16" />
          <div>
            <p className="font-space text-xs font-bold uppercase tracking-[0.24em] text-white/45">Central de comando</p>
            <h1 className="motion-safe:animate-bounce-slow motion-reduce:animate-none font-space text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
              GHOST <span className="text-dashboard-accent drop-shadow-[0_0_22px_rgba(169,201,127,0.38)]">BOT</span>
            </h1>
          </div>
        </div>
      </section>

      <section className="w-full max-w-[540px] px-3 sm:px-0">
          <form
            onSubmit={handleSubmit}
            className="flex min-h-[520px] flex-col overflow-hidden rounded-[2.25rem] bg-dashboard-sidebar/85 p-7 shadow-[0_24px_90px_-28px_rgba(20,36,29,0.92)] backdrop-blur-2xl sm:min-h-[560px] sm:p-10"
          >
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-dashboard-accent-secondary/18 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-48 w-48 rounded-full bg-dashboard-accent/16 blur-3xl" />
          <div className="relative flex flex-1 flex-col">
            {isSignUp && (
              <div className="mb-8">
                <div className="mb-3">
                  <span className="font-space text-[10px] font-bold uppercase tracking-[0.2em] text-dashboard-accent-secondary/80">
                    Novo operador
                  </span>
                </div>
                <h2 className="font-space text-2xl font-black sm:text-3xl tracking-[-0.04em] text-white">
                  Comece sua operação
                </h2>
                <p className="mt-1 text-xs leading-5 text-white/50 sm:mt-2 sm:text-sm sm:leading-6">
                  Crie seu acesso e coloque seu bot para trabalhar.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-6 sm:gap-7">
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
                rightElement={!isSignUp && <Link href="/forget-password" className="font-space text-[10px] font-bold uppercase tracking-wider text-dashboard-accent-secondary hover:text-white">Recuperar</Link>}
                inputRightElement={
                  <button
                    type="button"
                    onClick={togglePassword}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
              className="mt-9 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-dashboard-accent via-[#C9DC9D] to-dashboard-accent-secondary px-4 py-3.5 font-space text-sm font-black uppercase tracking-wider text-dashboard-bg shadow-[0_12px_30px_-10px_rgba(169,201,127,0.42)] transition-all hover:brightness-110 hover:shadow-[0_16px_36px_-10px_rgba(169,201,127,0.52)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  {isSignUp ? "Criar meu acesso" : "ENTRAR NA CONTA"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>

            <div className="mt-8 text-center text-xs text-white/45">
              {isSignUp ? (
                <>Já tem conta? <Link href="/sign-in" className="font-bold text-dashboard-accent-secondary transition-colors hover:text-white">Entrar</Link></>
              ) : (
                <>Ainda não tem conta? <Link href="/sign-up" className="font-bold text-dashboard-accent-secondary transition-colors hover:text-white">Criar conta gratuita</Link></>
              )}
            </div>
          </div>
          </form>
        <p className="mt-5 text-center font-space text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">Seu dinheiro vai direto pro gateway — sem retenção.</p>
      </section>
    </div>
  )
}
