"use client"

import type React from "react"
import { useState, useCallback, memo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react"
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
  rightElement
}: any) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between ml-1">
      <Label htmlFor={id} className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      {rightElement}
    </div>
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />}
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className={`${Icon ? 'pl-11' : 'px-4'} ${rightElement ? 'pr-11' : ''} h-11 text-base bg-white/5 border-white/10 focus:border-primary/40 focus:ring-primary/10 transition-all rounded-xl placeholder:text-white/20`}
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
      if (isSignUp) {
        const { error } = await authClient.signUp.email({ email, password, name })
        if (error) throw new Error(error.message || "Falha ao criar conta")
        await authClient.signIn.email({ email, password })
      } else {
        const { error } = await authClient.signIn.email({ email, password })
        if (error) throw new Error(error.message || "Credenciais inválidas")
      }
      
      // Força a atualização do cache do router e redireciona para o painel
      router.refresh()
      router.push("/") // O painel está na raiz (app/(panel)/page.tsx)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }, [isSignUp, email, password, confirmPassword, name, router])

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), [])

  return (
    <div className="w-full max-w-[420px] px-4 py-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <GhostLogo className="w-14 h-14 mb-5" />
        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase italic">
          {isSignUp ? "Faça parte do" : "Bem-vindo ao"} <span className="text-primary">Ghost</span>Bot
        </h1>
        <p className="mt-3 text-sm text-muted-foreground opacity-80 max-w-[300px]">
          {isSignUp ? "Crie sua infraestrutura digital hoje e comece a escalar." : "Acesse seu centro de comando e gerencie sua operação."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-[22px] border border-white/10 bg-slate-900/40 backdrop-blur-md p-6 sm:p-8 shadow-2xl"
      >
        {isSignUp && (
          <FormInput id="name" label="Nome Completo" icon={User} value={name} onChange={setName} placeholder="Seu nome" required />
        )}
        <FormInput id="email" label="Email Corporativo" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" required />
        <FormInput
          id="password"
          label="Senha de Acesso"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          minLength={8}
          required
          rightElement={!isSignUp && <Link href="/forget-password" size="sm" className="text-[10px] font-bold text-primary uppercase tracking-wider">Recuperar</Link>}
        />
        {isSignUp && (
          <FormInput id="confirmPassword" label="Confirmar Senha" icon={Lock} type={showPassword ? "text" : "password"} value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" minLength={8} required />
        )}

        {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs font-medium text-red-400">{error}</div>}

        <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-black font-black uppercase text-sm rounded-xl transition-all active:scale-[0.98]" disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <span className="flex items-center gap-2">
              {isSignUp ? "Inicializar Sistema" : "Autorizar Acesso"}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>

        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          <Link href={isSignUp ? "/sign-in" : "/sign-up"} className="text-primary hover:underline">{isSignUp ? "Já tem conta? Entrar" : "Novo operador? Registrar Agora"}</Link>
        </p>
      </form>
    </div>
  )
}
