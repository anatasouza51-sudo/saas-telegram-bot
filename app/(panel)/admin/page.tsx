import Link from "next/link"
import { redirect } from "next/navigation"
import { Coins, ShieldCheck, WalletCards } from "lucide-react"
import { requirePlatformAdmin } from "@/lib/platform-admin"

export default async function AdminPage() {
  try {
    await requirePlatformAdmin()
    return (
      <div className="min-w-0 w-full space-y-6 px-3 pb-8 md:px-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-dashboard-accent-secondary/20 bg-[radial-gradient(circle_at_85%_15%,rgba(201,169,90,0.16),transparent_34%),linear-gradient(135deg,rgba(29,51,39,0.98),rgba(13,24,18,0.98))] p-5 shadow-[0_20px_80px_rgba(169,201,127,0.10)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-dashboard-accent-secondary/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-dashboard-accent-secondary"><ShieldCheck className="h-4 w-4" /> Control plane</div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">Painel Admin</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 md:text-base">Configurações globais da plataforma, separadas das operações de cada tenant.</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/65 backdrop-blur-sm"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Acesso administrativo</div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link href="/admin/gateways" className="group rounded-[1.5rem] border border-dashboard-border bg-dashboard-surface p-5 transition-colors hover:border-dashboard-accent/40 hover:bg-dashboard-surface-elevated">
            <WalletCards className="h-6 w-6 text-dashboard-accent" />
            <h2 className="mt-5 text-xl font-black text-white">Gateways globais</h2>
            <p className="mt-2 text-sm leading-6 text-white/50">Configure a Mistic Pay da plataforma e o destinatário administrativo do split.</p>
            <span className="mt-5 inline-flex text-xs font-bold uppercase tracking-wider text-dashboard-accent-secondary group-hover:text-dashboard-accent">Abrir configuração</span>
          </Link>
          <Link href="/admin/commission" className="group rounded-[1.5rem] border border-dashboard-border bg-dashboard-surface p-5 transition-colors hover:border-dashboard-accent/40 hover:bg-dashboard-surface-elevated">
            <Coins className="h-6 w-6 text-dashboard-accent-secondary" />
            <h2 className="mt-5 text-xl font-black text-white">Comissão da plataforma</h2>
            <p className="mt-2 text-sm leading-6 text-white/50">Ajuste a política de comissão sem expor o destinatário ao tenant.</p>
            <span className="mt-5 inline-flex text-xs font-bold uppercase tracking-wider text-dashboard-accent-secondary group-hover:text-dashboard-accent">Abrir política</span>
          </Link>
        </section>
      </div>
    )
  } catch (error) {
    if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.stack?.includes("redirect"))) throw error
    redirect("/")
  }
}

export const dynamic = "force-dynamic"
export const revalidate = 0

