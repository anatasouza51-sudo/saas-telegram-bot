"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowRight } from "lucide-react"
import { GhostLogo } from "@/components/ghost-logo"

export function TwoFactorVerify() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [trustDevice, setTrustDevice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!code || code.length < 6) {
      setError("Digite um codigo valido de 6 digitos")
      return
    }

    setLoading(true)

    try {
      const result = await authClient.twoFactor.verifyTotp({
        code,
        trustDevice,
      })

      if (result.error) {
        setError(result.error.message || "Codigo invalido")
        setLoading(false)
        return
      }

      router.refresh()

      setTimeout(() => {
        window.location.href = "/"
      }, 300)
    } catch (err) {
      console.error("2FA verification error:", err)
      setError("Erro ao verificar codigo. Tente novamente.")
      setLoading(false)
    }
  }, [code, trustDevice, router])

  return (
    <div className="w-full max-w-[420px] px-4 py-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <GhostLogo className="w-14 h-14 mb-5" />
        <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-widest uppercase italic font-mono">
          VERIFICACAO 2FA
        </h1>
        <p className="mt-3 text-sm text-muted-foreground opacity-80 max-w-[300px]">
          Digite o codigo de 6 digitos do seu autenticador
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 bg-[#0c0d12] border border-gray-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 backdrop-blur-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="code" className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
            Codigo de Autenticacao
          </Label>
          <Input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="h-11 text-sm bg-[#121319] border-gray-800 focus:border-gray-600 focus:ring-gray-600 transition-all rounded-xl placeholder:text-gray-600 text-white text-center tracking-widest text-lg font-mono"
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="trustDevice"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-[#121319] cursor-pointer"
          />
          <label htmlFor="trustDevice" className="text-xs text-gray-400 cursor-pointer">
            Confiar neste dispositivo por 30 dias
          </label>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs font-medium text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-200 hover:bg-white text-black font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2 active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              Verificar
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </button>
      </form>
    </div>
  )
}
