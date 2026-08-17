import { redirect } from "next/navigation"
import { Coins, ShieldCheck } from "lucide-react"
import { AdminCommissionForm } from "@/components/admin-commission-form"
import { getPlatformMisticPayConfig } from "@/lib/platform-settings"
import { requirePlatformAdmin } from "@/lib/platform-admin"

export default async function AdminCommissionPage() {
  try {
    await requirePlatformAdmin()
    const config = await getPlatformMisticPayConfig()
    return (
      <div className="min-w-0 w-full space-y-6 px-3 pb-8 md:px-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-dashboard-accent-secondary/20 bg-[radial-gradient(circle_at_85%_15%,rgba(201,169,90,0.16),transparent_34%),linear-gradient(135deg,rgba(29,51,39,0.98),rgba(13,24,18,0.98))] p-5 shadow-[0_20px_80px_rgba(169,201,127,0.10)] md:p-8">
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-dashboard-accent-secondary"><Coins className="h-4 w-4" /> Administração da plataforma</div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">Comissão</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 md:text-base">A política de comissão fica separada da configuração que o vendedor usa para receber pagamentos.</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/65 backdrop-blur-sm"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Admin principal</div>
          </div>
        </section>
        <AdminCommissionForm initial={{ commissionCents: config.commissionCents, commissionPercent: config.commissionPercent }} />
      </div>
    )
  } catch (error) {
    if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.stack?.includes("redirect"))) throw error
    redirect("/")
  }
}
