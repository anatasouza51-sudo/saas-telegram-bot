"use client"

import { useEffect } from "react"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PostsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[PostsError] Digest:", error.digest)
    console.error("[PostsError] Message:", error.message)
    console.error("[PostsError] Stack:", error.stack)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
      <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-xl font-black uppercase tracking-tight text-white">
          Ocorreu um erro inesperado
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Não foi possível carregar ou processar a página de postagens. 
          {error.digest && (
            <span className="block mt-2 font-mono text-[10px] opacity-50">
              ID do erro (digest): {error.digest}
            </span>
          )}
        </p>
        <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Detalhes do erro:</p>
          <p className="text-xs text-destructive-foreground/80 break-words">
            {error.message || "Erro desconhecido no servidor."}
          </p>
        </div>
      </div>

      <div className="flex flex-col w-full gap-3 max-w-xs">
        <Button 
          onClick={() => reset()}
          className="w-full bg-white text-black hover:bg-white/90 font-bold rounded-xl h-12"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
        <a href="/dashboard" className="w-full">
          <Button variant="ghost" className="w-full text-muted-foreground font-bold rounded-xl h-12">
            Voltar ao Início
          </Button>
        </a>
      </div>
    </div>
  )
}
