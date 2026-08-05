"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, LogOut } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error("[AppError] Erro capturado no boundary:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-dashboard-bg text-dashboard-text flex items-center justify-center p-6">
      <div className="flex flex-col items-center text-center gap-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-dashboard-text">Painel Indisponível</h2>
        <p className="text-sm text-dashboard-text-muted max-w-sm">
          Não foi possível carregar esta página. O servidor pode estar temporariamente indisponível ou a sessão expirou.
        </p>
        {error.digest && (
          <p className="text-xs text-dashboard-text-discreet font-mono">
            Código: {error.digest}
          </p>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => reset()}
            className="w-full px-8 py-3 bg-dashboard-accent hover:bg-dashboard-accent/90 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>
          <button
            onClick={() => router.push("/sign-in")}
            className="w-full px-8 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Voltar ao Login
          </button>
        </div>
      </div>
    </div>
  )
}
