"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log o erro no console do servidor via console.error
    console.error("[GlobalError] Erro fatal capturado:", error)
  }, [error])

  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-dashboard-bg text-white min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center text-center gap-6 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-black tracking-tight">Ocorreu um erro inesperado</h2>
          <p className="text-sm text-white/60 max-w-sm">
            Algo deu errado no servidor. Tente recarregar a página. Se o problema persistir, verifique a conexão com o banco de dados.
          </p>
          {error.digest && (
            <p className="text-xs text-white/30 font-mono">
              Código: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="mt-4 px-8 py-3 bg-dashboard-accent-secondary hover:bg-dashboard-accent-secondary/90 text-white font-bold rounded-xl transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </body>
    </html>
  )
}
