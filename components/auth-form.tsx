"use client"

import type React from "react"
import { useState, useCallback, memo } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react"
import { GhostLogo } from "@/components/ghost-logo"

// Memoized input components to prevent re-renders of the entire form on every keystroke
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
  <div className="space-y-1.5">
    <div className="flex items-center justify-between ml-1">
      <Label htmlFor={id} className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      {rightElement}
    </div>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/50" />}
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className={`${Icon ? 'pl-10' : 'px-3'} ${rightElement ? 'pr-10' : ''} h-10 sm:h-11 text-sm bg-white/5 border-white/5 focus:border-primary/40 focus:ring-primary/10 transition-all rounded-lg placeholder:text-white/20`}
      />
    </div>
  </div>
))
FormInput.displayName = "FormInput"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
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
        
        const { error: signInError } = await authClient.signIn.email({
          email,
          password,
        })
        if (signInError)
          throw new Error(signInError.message || "Falha ao iniciar sessão")
      } else {
        const { error } = await authClient.signIn.email({ email, password })
        if (error) throw new Error(error.message || "Credenciais inválidas")
      }
      window.location.assign("/")
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }, [isSignUp, email, password, confirmPassword, name])

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), [])

  return (
    <div className="w-full max-w-[420px] px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-8 sm:mb-10 flex flex-col items-center text-center">
        <div className="relative mb-4 sm:mb-6">
          {/* Reduced blur and animation complexity */}
          <div className="absolute -inset-4 bg-primary/10 blur-xl rounded-full opacity-40" />
          <GhostLogo className="relative w-12 h-12 sm:w-14 sm:h-14" />
        </div>
        
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter text-white uppercase italic leading-tight">
          {isSignUp ? "Faça parte do" : "Bem-vindo ao"} <span className="text-primary">Ghost</span>Bot
        </h1>
        
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-[320px] opacity-80">
          {isSignUp
            ? "Crie sua infraestrutura digital hoje e comece a escalar suas vendas no Telegram."
            : "Acesse seu centro de comando e gerencie sua operação automatizada."}
        </p>
      </div>

      <div className="relative group">
        {/* Optimized glow: removed animate-mesh, simplified opacity */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/40 to-accent/40 rounded-[18px] blur-sm opacity-20 transition duration-500" />
        
        <form
          onSubmit={handleSubmit}
          className="relative flex flex-col gap-4 sm:gap-5 rounded-[17px] border border-white/10 bg-black/60 backdrop-blur-md p-5 sm:p-6 shadow-xl"
        >
          {isSignUp && (
            <FormInput
              id="name"
              label="Nome Completo"
              icon={User}
              value={name}
              onChange={setName}
              placeholder="Ex: João Silva"
              required
            />
          )}

          <FormInput
            id="email"
            label="Endereço de Email"
            icon={Mail}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="seu@email.com"
            required
          />

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
            rightElement={
              !isSignUp ? (
                <Link
                  href="/forget-password"
                  className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                >
                  Recuperar
                </Link>
              ) : null
            }
          />

          {isSignUp && (
            <FormInput
              id="confirmPassword"
              label="Confirmar Senha"
              icon={Lock}
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="••••••••"
              minLength={8}
              required
            />
          )}

          {/* Password toggle button handled separately to keep FormInput generic */}
          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-10 top-[calc(50%+32px)] -translate-y-1/2 text-muted-foreground hover:text-white transition-colors z-10"
            style={{ top: isSignUp ? '260px' : '180px' }}
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-10 sm:h-11 mt-1 sm:mt-2 bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-widest text-xs sm:text-sm rounded-lg transition-all active:scale-[0.98] group/btn" 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="flex items-center gap-1.5">
                {isSignUp ? "Inicializar Sistema" : "Autorizar Acesso"}
                <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>

          <p className="mt-1 sm:mt-2 text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {isSignUp ? "Já possui uma conta? " : "Novo operador? "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              {isSignUp ? "Entrar" : "Registrar Agora"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
