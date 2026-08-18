import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  DatabaseZap,
  FileBarChart,
  Layers3,
  ShieldCheck,
  Store,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { getPlatformOverview } from "@/lib/queries/platform-admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const number = new Intl.NumberFormat("pt-BR")

function MetricCard({ label, value, detail, icon: Icon, tone = "lime" }: { label: string; value: string; detail: string; icon: typeof Store; tone?: "lime" | "copper" | "gold" | "blue" }) {
  const toneClass = {
    lime: "border-admin-lime/20 bg-admin-lime/[0.07] text-admin-lime",
    copper: "border-admin-copper/20 bg-admin-copper/[0.07] text-admin-copper",
    gold: "border-admin-gold/20 bg-admin-gold/[0.07] text-admin-gold",
    blue: "border-sky-300/20 bg-sky-300/[0.06] text-sky-200",
  }[tone]
  return <article className="rounded-[1.35rem] border border-white/[0.08] bg-admin-surface p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-white/45">{label}</p><p className="mt-3 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">{value}</p><p className="mt-2 text-xs text-white/40">{detail}</p></div><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}><Icon className="h-5 w-5" /></span></div></article>
}

export default async function AdminPage() {
  try {
    await requirePlatformAdmin()
    const { totals, stores, memberStats, config } = await getPlatformOverview()
    const topStores = [...stores].sort((a, b) => b.grossRevenue - a.grossRevenue).slice(0, 5)
    const conversion = totals.totalOrders > 0 ? Math.round((totals.approvedOrders / totals.totalOrders) * 100) : 0

    return <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-admin-border bg-[radial-gradient(circle_at_85%_15%,rgba(216,185,104,0.16),transparent_34%),linear-gradient(135deg,rgba(22,49,36,0.98),rgba(11,23,18,0.98))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.22)] sm:p-8 lg:p-10"><div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-admin-copper/10 blur-3xl" /><div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between"><div className="max-w-3xl"><div className="mb-4 flex items-center gap-2 font-space text-[10px] font-black uppercase tracking-[0.25em] text-admin-copper"><ShieldCheck className="h-4 w-4" /> Control plane / visão geral</div><h1 className="text-3xl font-black tracking-[-0.06em] text-white sm:text-5xl">A operação inteira, sob controle.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">Acompanhe vendas, comissões, membros e saúde dos tenants em um ambiente separado das operações individuais.</p></div><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-admin-lime/20 bg-admin-lime/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-admin-lime"><span className="h-1.5 w-1.5 rounded-full bg-admin-lime" /> Produção protegida</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/55"><DatabaseZap className="h-3.5 w-3.5" /> Dados reais</span></div></div></section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Receita aprovada" value={currency.format(totals.grossRevenue)} detail={`${number.format(totals.approvedOrders)} pedidos aprovados`} icon={CircleDollarSign} tone="lime" /><MetricCard label="Comissão estimada" value={currency.format(totals.commissionCents / 100)} detail={`${config.commissionCents} centavos por pedido aprovado`} icon={WalletCards} tone="gold" /><MetricCard label="Tenants ativos" value={number.format(stores.length)} detail={`${number.format(memberStats.summary.tenantMembers)} membros vinculados`} icon={Store} tone="copper" /><MetricCard label="Conversão global" value={`${conversion}%`} detail={`${number.format(totals.totalOrders)} pedidos no total`} icon={BarChart3} tone="blue" /></section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><article className="rounded-[1.6rem] border border-white/[0.08] bg-admin-surface p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-space text-[10px] font-black uppercase tracking-[0.22em] text-admin-copper">Desempenho consolidado</p><h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-white">Tenants por receita aprovada</h2></div><Link href="/admin/sales" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-admin-lime hover:text-white">Abrir vendas <ArrowUpRight className="h-3.5 w-3.5" /></Link></div><div className="mt-6 space-y-4">{topStores.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/40">Ainda não existem tenants com vendas consolidadas.</div> : topStores.map((store, index) => { const share = totals.grossRevenue > 0 ? Math.max(3, (store.grossRevenue / totals.grossRevenue) * 100) : 0; return <div key={store.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3"><span className="text-xs font-black text-white/30">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-bold text-white/80">{store.name}</span><span className="shrink-0 text-xs font-bold text-white/50">{currency.format(store.grossRevenue)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-admin-lime to-admin-gold" style={{ width: `${share}%` }} /></div></div><span className="hidden text-xs font-bold text-admin-lime sm:block">{store.approvedOrders} aprov.</span></div> })}</div></article>

        <article className="rounded-[1.6rem] border border-white/[0.08] bg-admin-surface p-5 sm:p-6"><p className="font-space text-[10px] font-black uppercase tracking-[0.22em] text-admin-copper">Pulso da operação</p><h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-white">Status da plataforma</h2><div className="mt-6 space-y-3"><div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3"><span className="flex items-center gap-3 text-sm text-white/65"><CheckCircle2 className="h-4 w-4 text-admin-lime" /> Aprovados</span><strong className="text-white">{number.format(totals.approvedOrders)}</strong></div><div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3"><span className="flex items-center gap-3 text-sm text-white/65"><Clock3 className="h-4 w-4 text-admin-gold" /> Pendentes</span><strong className="text-white">{number.format(totals.pendingOrders)}</strong></div><div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3"><span className="flex items-center gap-3 text-sm text-white/65"><XCircle className="h-4 w-4 text-admin-copper" /> Recusados</span><strong className="text-white">{number.format(totals.refusedOrders)}</strong></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/[0.08] p-4"><UsersRound className="h-4 w-4 text-admin-lime" /><p className="mt-3 text-xl font-black text-white">{number.format(memberStats.summary.storeOwners)}</p><p className="mt-1 text-[11px] text-white/40">proprietários</p></div><div className="rounded-2xl border border-white/[0.08] p-4"><Layers3 className="h-4 w-4 text-admin-copper" /><p className="mt-3 text-xl font-black text-white">{number.format(totals.products)}</p><p className="mt-1 text-[11px] text-white/40">produtos ativos</p></div></div></article></section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Link href="/admin/members" className="group rounded-[1.35rem] border border-white/[0.08] bg-admin-surface p-5 transition-colors hover:border-admin-lime/35 hover:bg-admin-surface-elevated"><UsersRound className="h-5 w-5 text-admin-lime" /><h3 className="mt-5 font-black text-white">Membros e tenants</h3><p className="mt-2 text-sm leading-6 text-white/45">Gerencie a visão global de contas e vínculos.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-admin-lime">Abrir módulo <ArrowUpRight className="h-3.5 w-3.5" /></span></Link><Link href="/admin/orders" className="group rounded-[1.35rem] border border-white/[0.08] bg-admin-surface p-5 transition-colors hover:border-admin-lime/35 hover:bg-admin-surface-elevated"><ClipboardList className="h-5 w-5 text-admin-copper" /><h3 className="mt-5 font-black text-white">Pedidos globais</h3><p className="mt-2 text-sm leading-6 text-white/45">Acompanhe o fluxo consolidado de pedidos.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-admin-copper">Abrir módulo <ArrowUpRight className="h-3.5 w-3.5" /></span></Link><Link href="/admin/reports" className="group rounded-[1.35rem] border border-white/[0.08] bg-admin-surface p-5 transition-colors hover:border-admin-lime/35 hover:bg-admin-surface-elevated"><FileBarChart className="h-5 w-5 text-admin-gold" /><h3 className="mt-5 font-black text-white">Relatórios</h3><p className="mt-2 text-sm leading-6 text-white/45">Encontre indicadores para decisões da plataforma.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-admin-gold">Abrir módulo <ArrowUpRight className="h-3.5 w-3.5" /></span></Link><Link href="/admin/gateways" className="group rounded-[1.35rem] border border-white/[0.08] bg-admin-surface p-5 transition-colors hover:border-admin-lime/35 hover:bg-admin-surface-elevated"><WalletCards className="h-5 w-5 text-sky-200" /><h3 className="mt-5 font-black text-white">Gateways globais</h3><p className="mt-2 text-sm leading-6 text-white/45">Configure o control plane de pagamentos.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-sky-200">Abrir módulo <ArrowUpRight className="h-3.5 w-3.5" /></span></Link></section>
    </div>
  } catch (error) {
    if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.stack?.includes("redirect"))) throw error
    redirect("/admin")
  }
}
