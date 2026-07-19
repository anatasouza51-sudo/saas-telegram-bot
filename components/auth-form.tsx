"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, Mail, Lock, User } from "lucide-react"
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
    <div className="w-full max-w-[440px] px-4 py-8 animate-in fade-in zoom-in duration-500">
      <div className="mb-10 flex flex-col items-center text-center">
        <GhostLogo className="mb-6" />
        
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {isSignUp ? "Crie sua conta" : "Bem-vindo ao GhostBot"}
        </h1>
        
        <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-[360px]">
          {isSignUp
            ? "Comece hoje mesmo a vender produtos digitais e gerenciar assinaturas em uma plataforma moderna, rápida e segura."
            : "Automatize sua loja no Telegram e gerencie produtos digitais, assinaturas, pedidos e clientes em um único painel."}
        </p>
      </div>

      <div className="relative group">
        {/* Decorative background glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[22px] blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
        
        <form
          onSubmit={handleSubmit}
          className="relative flex flex-col gap-5 rounded-[20px] border border-white/10 bg-card/80 backdrop-blur-xl p-8 shadow-2xl"
        >
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/70 ml-1">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="pl-10 h-12 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl"
                />
              </div>
            </div>
          )}

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

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <Label htmlFor="password" className="text-white/70">Senha</Label>
              {!isSignUp && (
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Esqueci minha senha
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
                className="pl-10 pr-10 h-12 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white/70 ml-1">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  required
                  className="pl-10 h-12 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
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
              isSignUp ? "Criar Conta" : "Entrar"
            )}
          </Button>

          <p className="mt-2 text-center text-sm text-muted-foreground">
            {isSignUp ? "Já possui uma conta? " : "Ainda não possui uma conta? "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {isSignUp ? "Entrar" : "Criar conta"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
