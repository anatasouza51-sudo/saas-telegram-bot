import { redirect } from "next/navigation"
import { Coins, ShieldCheck } from "lucide-react"
import { AdminCommissionForm } from "@/components/admin-commission-form"
import { getPlatformMisticPayConfig } from "@/lib/platform-settings"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { AdminBadge, AdminKpi, AdminPageIntro, AdminPanel } from "@/components/admin-ui"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminCommissionPage() {
  try {
    await requirePlatformAdmin()
    const config = await getPlatformMisticPayConfig()
    return <div className="space-y-7"><AdminPageIntro eyebrow="Control plane / política financeira" title="Comissões da plataforma" description="A política de comissão é global, separada da configuração de gateway de cada vendedor e protegida pelo acesso administrativo." /><section className="grid gap-4 sm:grid-cols-3"><AdminKpi label="Comissão fixa" value={`R$ ${(config.commissionCents / 100).toFixed(2).replace('.', ',')}`} detail={`${config.commissionCents} centavos por aprovação`} icon={Coins} tone="gold" /><AdminKpi label="Percentual informativo" value={`${config.commissionPercent}%`} detail="Exibição administrativa" icon={ShieldCheck} tone="lime" /><AdminKpi label="Gateway global" value={config.enabled ? "Ativo" : "Desativado"} detail="Mistic Pay control plane" icon={Coins} tone={config.enabled ? "lime" : "copper"} /></section><AdminPanel title="Política vigente" description="Altere somente se a regra operacional da plataforma tiver sido definida e validada."><div className="mb-5 flex flex-wrap items-center gap-2"><AdminBadge tone="warning">Split fixo</AdminBadge><AdminBadge tone="success">Tenant não visualiza</AdminBadge><AdminBadge>Sem cobrança nesta tela</AdminBadge></div><AdminCommissionForm initial={{ commissionCents: config.commissionCents, commissionPercent: config.commissionPercent }} /></AdminPanel></div>
  } catch (error) {
    if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.stack?.includes("redirect"))) throw error
    redirect("/admin")
  }
}
