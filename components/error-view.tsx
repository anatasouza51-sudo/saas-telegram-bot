import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorViewProps {
  title?: string
  message?: string
  retryHref?: string
}

export function ErrorView({
  title = "Sessão Indisponível",
  message = "Não foi possível carregar esta seção. Isso pode ocorrer se o banco de dados estiver temporariamente indisponível ou sobrecarregado.",
  retryHref,
}: ErrorViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
      <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-black uppercase tracking-tight text-white">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {message}
        </p>
      </div>
      {retryHref && (
        <div className="flex flex-col w-full gap-3 max-w-xs">
          <a href={retryHref} className="w-full">
            <Button className="w-full bg-white text-black hover:bg-white/90 font-bold rounded-xl h-12">
              Tentar Novamente
            </Button>
          </a>
        </div>
      )}
    </div>
  )
}
