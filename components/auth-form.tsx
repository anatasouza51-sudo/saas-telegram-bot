"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react"
import { GhostLogo } from "@/components/ghost-logo"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isSignUp = mode === "sign-up"

  async function handleSubmit(e: React.FormEvent) {
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
  }

  return (
    <div className="w-full max-w-[460px] px-4 py-8">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full opacity-50 animate-pulse" />
          <GhostLogo className="relative" />
        </div>
        
        <h1 className="text-3xl font-black tracking-tighter text-white sm:text-4xl uppercase italic">
          {isSignUp ? "Join the" : "Welcome to"} <span className="text-primary">Ghost</span>Bot
        </h1>
        
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-[340px] opacity-80">
          {isSignUp
            ? "Crie sua infraestrutura digital hoje e comece a escalar suas vendas no Telegram."
            : "Acesse seu centro de comando e gerencie sua operação automatizada."}
        </p>
      </div>

      <div className="relative group">
        {/* Animated border glow */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-primary via-accent to-primary rounded-[24px] blur-sm opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-mesh" />
        
        <form
          onSubmit={handleSubmit}
          className="relative flex flex-col gap-6 rounded-[23px] border border-white/10 bg-black/40 backdrop-blur-2xl p-8 shadow-2xl"
        >
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: John Doe"
                  required
                  className="pl-11 h-13 bg-white/5 border-white/5 focus:border-primary/40 focus:ring-primary/10 transition-all rounded-xl placeholder:text-white/20"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Endereço de Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="pl-11 h-13 bg-white/5 border-white/5 focus:border-primary/40 focus:ring-primary/10 transition-all rounded-xl placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Senha de Acesso</Label>
              {!isSignUp && (
                <Link
                  href="/forget-password"
                  className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                >
                  Recuperar
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
                className="pl-11 pr-11 h-13 bg-white/5 border-white/5 focus:border-primary/40 focus:ring-primary/10 transition-all rounded-xl placeholder:text-white/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Confirmar Senha</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  required
                  className="pl-11 h-13 bg-white/5 border-white/5 focus:border-primary/40 focus:ring-primary/10 transition-all rounded-xl placeholder:text-white/20"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-13 mt-2 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-sm rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all active:scale-[0.98] group/btn" 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                {isSignUp ? "Initialize System" : "Authorize Access"}
                <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>

          <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {isSignUp ? "Already a member? " : "New operator? "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              {isSignUp ? "Sign In" : "Register Now"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
