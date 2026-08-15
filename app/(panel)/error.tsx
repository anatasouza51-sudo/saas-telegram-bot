"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, LogOut } from "lucide-react"

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error("[PanelError] Erro capturado no painel:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-dashboard-bg text-white flex items-center justify-center p-6">
      <div className="flex flex-col items-center text-center gap-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-dashboard-accent-secondary/10 border border-dashboard-accent-secondary/20 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-dashboard-accent-secondary" />
        </div>
        <h2 className="text-xl font-black tracking-tight">Painel Indisponível</h2>
        <p className="text-sm text-white/60 max-w-sm">
          Não foi possível carregar o painel. Isso pode ocorrer se o banco de dados estiver temporariamente fora do ar ou se sua sessão expirou.
        </p>
        {error.digest && (
          <p className="text-xs text-white/30 font-mono">
            Código: {error.digest}
          </p>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => reset()}
            className="w-full px-8 py-3 bg-dashboard-accent-secondary hover:bg-[#E0A37E] text-dashboard-bg font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
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
