import { redirect } from "next/navigation"
import { ClipboardList, PackageCheck, ShoppingBag, Store } from "lucide-react"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { getPlatformOrders } from "@/lib/queries/platform-admin"
import { AdminBadge, AdminEmpty, AdminKpi, AdminPageIntro, AdminPanel, adminCurrency, adminNumber } from "@/components/admin-ui"

export const dynamic = "force-dynamic"
export const revalidate = 0

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "approved" || status === "delivered") return "success"
  if (status === "pending") return "warning"
  if (status === "refused" || status === "cancelled") return "danger"
  return "neutral"
}

function statusLabel(status: string) {
  return { approved: "Aprovado", pending: "Pendente", refused: "Recusado", cancelled: "Cancelado", delivered: "Entregue" }[status] ?? status
}

export default async function AdminOrdersPage() {
  try {
    await requirePlatformAdmin()
    const orders = await getPlatformOrders()
    const approved = orders.filter((order) => order.paymentStatus === "approved")
    const pending = orders.filter((order) => order.paymentStatus === "pending")
    const revenue = approved.reduce((sum, order) => sum + order.amount, 0)

    return <div className="space-y-7"><AdminPageIntro eyebrow="Control plane / operação" title="Pedidos globais" description="Acompanhe o fluxo recente de pedidos dos tenants sem alterar a operação ou expor segredos de gateway." action={{ href: "/admin/sales", label: "Ver vendas" }} /><section className="grid gap-4 sm:grid-cols-3"><AdminKpi label="Pedidos carregados" value={adminNumber.format(orders.length)} detail="Amostra recente por tenant" icon={ShoppingBag} /><AdminKpi label="Receita na amostra" value={adminCurrency.format(revenue)} detail={`${approved.length} aprovados`} icon={PackageCheck} tone="lime" /><AdminKpi label="Aguardando pagamento" value={adminNumber.format(pending.length)} detail="Status pendente" icon={ClipboardList} tone="gold" /></section><AdminPanel title="Fluxo recente" description="A listagem é ordenada pelo horário de criação e mantém o tenant identificado apenas para o uso administrativo.">{orders.length === 0 ? <AdminEmpty title="Nenhum pedido encontrado" description="Quando os tenants tiverem pedidos, eles aparecerão nesta visão consolidada." /> : <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left"><thead><tr className="border-b border-white/[0.08] text-[10px] font-black uppercase tracking-[0.14em] text-white/35"><th className="pb-3 pr-4">Pedido</th><th className="pb-3 pr-4">Tenant</th><th className="pb-3 pr-4">Valor</th><th className="pb-3 pr-4">Pagamento</th><th className="pb-3 pr-4">Entrega</th><th className="pb-3 pr-4">Gateway</th><th className="pb-3">Criado em</th></tr></thead><tbody>{orders.slice(0, 100).map((order) => <tr key={order.id} className="border-b border-white/[0.06] last:border-0"><td className="py-4 pr-4"><p className="max-w-[210px] truncate text-sm font-bold text-white/80">{order.productName ?? "Produto não informado"}</p><p className="mt-1 text-xs text-white/30">{order.id.slice(0, 10)}…</p></td><td className="py-4 pr-4"><span className="inline-flex items-center gap-2 text-sm text-white/60"><Store className="h-3.5 w-3.5 text-admin-lime" />{order.storeName}</span></td><td className="py-4 pr-4 text-sm font-bold text-white">{adminCurrency.format(order.amount)}</td><td className="py-4 pr-4"><AdminBadge tone={statusTone(order.paymentStatus)}>{statusLabel(order.paymentStatus)}</AdminBadge></td><td className="py-4 pr-4"><AdminBadge tone={statusTone(order.deliveryStatus)}>{statusLabel(order.deliveryStatus)}</AdminBadge></td><td className="py-4 pr-4 text-xs uppercase text-white/45">{order.gateway}</td><td className="py-4 text-xs text-white/40">{order.createdAt.toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div>}</AdminPanel></div>
  } catch (error) {
    if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.stack?.includes("redirect"))) throw error
    redirect("/admin")
  }
}
