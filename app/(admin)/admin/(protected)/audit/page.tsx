import { redirect } from "next/navigation"
import { Activity, Database, FileClock, ShieldCheck } from "lucide-react"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { AdminBadge, AdminEmpty, AdminKpi, AdminPageIntro, AdminPanel } from "@/components/admin-ui"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminAuditPage() {
  try {
    await requirePlatformAdmin()

    return <div className="space-y-7"><AdminPageIntro eyebrow="Control plane / governança" title="Auditoria administrativa" description="Área reservada para rastrear ações administrativas sem registrar secrets, tokens ou credenciais em texto aberto." /><section className="grid gap-4 sm:grid-cols-3"><AdminKpi label="Proteção de sessão" value="Ativa" detail="Guard server-side" icon={ShieldCheck} /><AdminKpi label="RLS tenant" value="Forçado" detail="Consulta consolidada segura" icon={Database} tone="lime" /><AdminKpi label="Eventos globais" value="Em preparação" detail="Trilha dedicada ainda não criada" icon={FileClock} tone="gold" /></section><AdminPanel title="Estado da trilha administrativa" description="O banco atual possui activity_logs tenant-scoped, mas ainda não possui uma tabela global de auditoria do control plane."><AdminEmpty title="Nenhum evento global exibido" description="Para não misturar logs de tenants nem inventar eventos, esta área permanecerá vazia até a criação de uma trilha platform_audit_events com retenção e política próprias." /></AdminPanel><section className="rounded-[1.35rem] border border-admin-lime/20 bg-admin-lime/[0.06] p-5"><div className="flex items-start gap-3"><Activity className="mt-0.5 h-5 w-5 shrink-0 text-admin-lime" /><div><h2 className="font-black text-white">Controles ativos</h2><p className="mt-2 text-sm leading-6 text-white/50">A autorização continua sendo feita no servidor por `requirePlatformAdmin()`. Configurações sensíveis são criptografadas e mascaradas. Nenhuma informação sensível será escrita nesta trilha.</p><div className="mt-4 flex flex-wrap gap-2"><AdminBadge tone="success">RBAC server-side</AdminBadge><AdminBadge tone="success">Tenant isolation</AdminBadge><AdminBadge tone="success">Secrets redacted</AdminBadge></div></div></div></section></div>
  } catch (error) {
    if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.stack?.includes("redirect"))) throw error
    redirect("/admin")
  }
}
