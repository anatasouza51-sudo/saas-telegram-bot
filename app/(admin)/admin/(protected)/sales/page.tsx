import { redirect } from "next/navigation"
import { ArrowRight, BarChart3, CircleDollarSign, Clock3, ShoppingBag, Store } from "lucide-react"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { getPlatformStoreStats } from "@/lib/queries/platform-admin"
import { getPlatformMisticPayConfig } from "@/lib/platform-settings"
import { AdminBadge, AdminEmpty, AdminKpi, AdminPageIntro, AdminPanel, adminCurrency, adminNumber } from "@/components/admin-ui"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminSalesPage() {
  try {
    await requirePlatformAdmin()
    const [stores, config] = await Promise.all([getPlatformStoreStats(), getPlatformMisticPayConfig()])
    const totals = stores.reduce((acc, store) => ({
      revenue: acc.revenue + store.grossRevenue,
      approved: acc.approved + store.approvedOrders,
      pending: acc.pending + store.pendingOrders,
      commission: acc.commission + store.commissionCents,
    }), { revenue: 0, approved: 0, pending: 0, commission: 0 })

    return <div className="space-y-7"><AdminPageIntro eyebrow="Control plane / vendas" title="Vendas da plataforma" description="Visão consolidada por tenant, calculada dentro do escopo RLS de cada operação." action={{ href: "/admin/orders", label: "Ver pedidos" }} /><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><AdminKpi label="Receita aprovada" value={adminCurrency.format(totals.revenue)} detail="Soma de pedidos aprovados" icon={CircleDollarSign} /><AdminKpi label="Pedidos aprovados" value={adminNumber.format(totals.approved)} detail="Todas as operações" icon={ShoppingBag} tone="blue" /><AdminKpi label="Pedidos pendentes" value={adminNumber.format(totals.pending)} detail="Aguardando confirmação" icon={Clock3} tone="gold" /><AdminKpi label="Comissão estimada" value={adminCurrency.format(totals.commission / 100)} detail="Split fixo por aprovação" icon={BarChart3} tone="copper" /></section><AdminPanel title="Desempenho por tenant" description="Ordenado pela receita aprovada. O tenant não recebe credenciais nem dados de outro tenant nesta área.">{stores.length === 0 ? <AdminEmpty title="Nenhum tenant encontrado" description="Quando houver proprietários de loja cadastrados, o desempenho consolidado aparecerá aqui." /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-white/[0.08] text-[10px] font-black uppercase tracking-[0.14em] text-white/35"><th className="pb-3 pr-4">Tenant</th><th className="pb-3 pr-4">Receita aprovada</th><th className="pb-3 pr-4">Aprovados</th><th className="pb-3 pr-4">Pendentes</th><th className="pb-3 pr-4">Comissão</th><th className="pb-3">Estado</th></tr></thead><tbody>{[...stores].sort((a, b) => b.grossRevenue - a.grossRevenue).map((store) => <tr key={store.id} className="border-b border-white/[0.06] last:border-0"><td className="py-4 pr-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-admin-lime/20 bg-admin-lime/10 text-admin-lime"><Store className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-white/80">{store.name}</p><p className="truncate text-xs text-white/35">{store.email}</p></div></div></td><td className="py-4 pr-4 text-sm font-bold text-white">{adminCurrency.format(store.grossRevenue)}</td><td className="py-4 pr-4 text-sm text-white/65">{adminNumber.format(store.approvedOrders)}</td><td className="py-4 pr-4 text-sm text-white/65">{adminNumber.format(store.pendingOrders)}</td><td className="py-4 pr-4 text-sm font-bold text-admin-gold">{adminCurrency.format(store.commissionCents / 100)}</td><td className="py-4"><AdminBadge tone={store.totalOrders > 0 ? "success" : "neutral"}>{store.totalOrders > 0 ? "Operando" : "Sem pedidos"}</AdminBadge></td></tr>)}</tbody></table></div>}</AdminPanel><div className="rounded-[1.35rem] border border-admin-gold/20 bg-admin-gold/[0.06] p-4 text-xs leading-5 text-white/55"><strong className="text-admin-gold">Política aplicada:</strong> a comissão exibida usa o valor global salvo no control plane ({adminCurrency.format(config.commissionCents / 100)} por pedido aprovado). Nenhuma cobrança, repasse ou alteração financeira é executada nesta tela.</div></div>
  } catch (error) {
    if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.stack?.includes("redirect"))) throw error
    redirect("/admin")
  }
}
