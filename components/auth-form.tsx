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
      <Label htmlFor={id} className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">{label}</Label>
      {rightElement}
    </div>
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />}
        <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className={`${Icon ? 'pl-11' : 'px-4'} ${rightElement ? 'pr-11' : ''} h-11 text-sm bg-[#0a0b0c] border-white/5 focus:border-white/20 focus:ring-white/10 transition-all rounded-xl placeholder:text-gray-600 text-white`}
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
      setError("As senhas nao coincidem")
      return
    }
    
    setLoading(true)
    
    try {
      let result: any
      
      if (isSignUp) {
        result = await authClient.signUp.email({ email, password, name })
        if (result.error) {
          setError(result.error.message || "Falha ao criar conta")
          setLoading(false)
          return
        }
        result = await authClient.signIn.email({ email, password })
      } else {
        result = await authClient.signIn.email({ email, password })
      }

      if (result.error) {
        setError(result.error.message || "Credenciais invalidas")
        setLoading(false)
        return
      }

      // Verificar se 2FA eh necessario
      if (result.data?.twoFactorRedirect) {
        router.push("/two-factor")
        return
      }
      
      // Sucesso no login sem 2FA — aguardar propagação do cookie de sessão
      router.refresh()
      setTimeout(() => {
        window.location.replace("/")
      }, 1000)
      
    } catch (err) {
      console.error("Auth error:", err)
      setError("Erro de sistema. Tente novamente.")
      setLoading(false)
    }
  }, [isSignUp, email, password, confirmPassword, name, router])

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), [])

  return (
    <div className="w-full max-w-[420px] px-4 py-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <GhostLogo className="w-14 h-14 mb-5" />
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
          GHOST <span className="text-dashboard-accent drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">BOT</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground opacity-80 max-w-[300px]">
          {isSignUp ? "Crie sua infraestrutura digital hoje e comece a escalar." : "Acesse seu centro de comando e gerencie sua operacao."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 bg-[#08090a]/80 border border-white/5 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] z-10 backdrop-blur-md"
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
          placeholder="........"
          minLength={8}
          required
          rightElement={!isSignUp && <Link href="/forget-password" className="text-[10px] font-bold text-primary uppercase tracking-wider">Recuperar</Link>}
        />
        {isSignUp && (
          <FormInput id="confirmPassword" label="Confirmar Senha" icon={Lock} type={showPassword ? "text" : "password"} value={confirmPassword} onChange={setConfirmPassword} placeholder="........" minLength={8} required />
        )}

        {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs font-medium text-red-400">{error}</div>}

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-white hover:bg-white/90 text-black font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2 active:scale-[0.98] shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-2px_rgba(255,255,255,0.4)]"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <span className="flex items-center gap-2">
              {isSignUp ? "Inicializar Sistema" : "Autorizar Acesso"}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </button>

        <div className="mt-2 text-center text-xs text-gray-400">
          {isSignUp ? (
            <>Ja tem conta? <Link href="/sign-in" className="text-white font-bold hover:underline">Entrar</Link></>
          ) : (
            <>Nao tem conta? <Link href="/sign-up" className="text-white font-bold hover:underline">Criar conta gratuita</Link></>
          )}
        </div>
      </form>
    </div>
  )
}
