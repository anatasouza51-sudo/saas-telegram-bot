"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, Loader2 } from "lucide-react"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === "sign-up"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({ email, password, name })
        if (error) throw new Error(error.message || "Falha ao criar conta")
      } else {
        const { error } = await authClient.signIn.email({ email, password })
        if (error) throw new Error(error.message || "Credenciais inválidas")
      }
      router.push("/")
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Bot className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isSignUp ? "Criar conta administrativa" : "Painel Administrativo"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground text-balance">
          {isSignUp
            ? "Configure o primeiro acesso ao painel de gerenciamento."
            : "Entre com suas credenciais para acessar o painel."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        {isSignUp && (
          <div className="mb-4 space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </div>
        )}

        <div className="mb-4 space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@empresa.com"
            required
          />
        </div>

        <div className="mb-4 space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
          />
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSignUp ? "Criar conta" : "Entrar"}
        </Button>
      </form>
    </div>
  )
}
