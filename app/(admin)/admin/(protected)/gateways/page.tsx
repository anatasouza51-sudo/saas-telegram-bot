import { redirect } from "next/navigation"
import { KeyRound, ShieldCheck, WalletCards } from "lucide-react"
import { AdminMisticPayForm } from "@/components/admin-misticpay-form"
import { getPlatformMisticPayAdminState } from "@/app/actions/platform-settings"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { AdminPageIntro, AdminPanel } from "@/components/admin-ui"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminGatewaysPage() {
  try {
    await requirePlatformAdmin()
    const state = await getPlatformMisticPayAdminState()
    return <div className="space-y-7"><AdminPageIntro eyebrow="Control plane / pagamentos" title="Gateways globais" description="Configure as credenciais da plataforma e o destino administrativo do split. Nada desta área pertence ao tenant." /><AdminMisticPayForm initial={state} /><div className="grid gap-4 md:grid-cols-3"><AdminPanel title="Mistic Pay" description="Gateway PIX operacional da plataforma."><div className="flex items-center gap-2 text-sm text-white/65"><WalletCards className="h-4 w-4 text-admin-lime" /> Credenciais separadas</div></AdminPanel><AdminPanel title="Secrets" description="Valores sensíveis permanecem server-only."><div className="flex items-center gap-2 text-sm text-white/65"><KeyRound className="h-4 w-4 text-admin-gold" /> Mascarados</div></AdminPanel><AdminPanel title="Controle" description="Somente admin principal pode alterar."><div className="flex items-center gap-2 text-sm text-white/65"><ShieldCheck className="h-4 w-4 text-admin-copper" /> RBAC ativo</div></AdminPanel></div></div>
  } catch (error) {
    if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.stack?.includes("redirect"))) throw error
    redirect("/admin")
  }
}
