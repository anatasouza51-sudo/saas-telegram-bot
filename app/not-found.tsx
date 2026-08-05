import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dashboard-bg text-dashboard-text flex items-center justify-center p-6">
      <div className="flex flex-col items-center text-center gap-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <span className="text-2xl font-black text-dashboard-accent">404</span>
        </div>
        <h2 className="text-xl font-black tracking-tight">Página não encontrada</h2>
        <p className="text-sm text-dashboard-text-muted max-w-sm">
          A página que você está procurando não existe ou foi removida.
        </p>
        <Link
          href="/"
          className="mt-4 px-8 py-3 bg-dashboard-accent hover:bg-dashboard-accent/90 text-white font-bold rounded-xl transition-colors"
        >
          Voltar ao Painel
        </Link>
      </div>
    </div>
  )
}
