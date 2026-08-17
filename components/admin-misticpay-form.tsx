"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, KeyRound, LockKeyhole, Save, ShieldCheck } from "lucide-react"
import { savePlatformMisticPaySettings } from "@/app/actions/platform-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function AdminMisticPayForm({
  initial,
}: {
  initial: {
    configured: boolean
    enabled: boolean
    clientId: string
    hasClientSecret: boolean
    hasSplitUser: boolean
    commissionCents: number
    commissionPercent: string
  }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [clientId, setClientId] = useState(initial.clientId)
  const [clientSecret, setClientSecret] = useState("")
  const [splitUser, setSplitUser] = useState("")
  const [commissionCents, setCommissionCents] = useState(String(initial.commissionCents))
  const [commissionPercent, setCommissionPercent] = useState(initial.commissionPercent)
  const [enabled, setEnabled] = useState(initial.enabled)

  function submit() {
    startTransition(async () => {
      try {
        await savePlatformMisticPaySettings({
          clientId,
          clientSecret: clientSecret.trim() || undefined,
          splitUser: splitUser.trim() || undefined,
          commissionCents: Number(commissionCents),
          commissionPercent: Number(commissionPercent),
          enabled,
        })
        setClientSecret("")
        setSplitUser("")
        toast.success("Configuração global Mistic Pay salva")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar")
      }
    })
  }

  return (
    <article className="relative overflow-hidden rounded-[1.5rem] border border-dashboard-accent-secondary/25 bg-[radial-gradient(circle_at_8%_0%,rgba(201,169,90,0.14),transparent_32%),linear-gradient(145deg,rgba(29,51,39,0.98),rgba(16,32,25,0.98))] shadow-[0_20px_70px_rgba(20,36,29,0.42)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-dashboard-accent-secondary/10 blur-3xl" />
      <div className="relative border-b border-white/10 p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-dashboard-accent-secondary">
              <ShieldCheck className="h-4 w-4" /> Control plane
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">Mistic Pay da plataforma</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Configuração exclusiva do administrador para o split e a comissão da plataforma. Esses dados não aparecem no painel dos tenants.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs font-bold text-white/70">
            {enabled ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <LockKeyhole className="h-4 w-4 text-amber-200" />}
            {enabled ? "Ativa" : "Desativada"}
          </div>
        </div>
      </div>

      <div className="relative grid gap-5 p-5 md:p-6 lg:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="platform-misticpay-client-id" className="text-xs font-bold uppercase tracking-wider text-white/55">Client ID da plataforma</Label>
          <Input id="platform-misticpay-client-id" value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder="client_id da conta da plataforma" className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="platform-misticpay-client-secret" className="text-xs font-bold uppercase tracking-wider text-white/55">Client Secret da plataforma</Label>
          <Input id="platform-misticpay-client-secret" type="password" autoComplete="new-password" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} placeholder={initial.hasClientSecret ? "•••••••• (salvo — preencha para alterar)" : "client_secret da plataforma"} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25" />
          <p className="text-xs leading-relaxed text-white/40">Cifrado no servidor; deixe vazio para preservar o valor salvo.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="platform-misticpay-split-user" className="text-xs font-bold uppercase tracking-wider text-white/55">splitUser da plataforma</Label>
          <Input id="platform-misticpay-split-user" type="password" autoComplete="off" value={splitUser} onChange={(event) => setSplitUser(event.target.value)} placeholder={initial.hasSplitUser ? "•••••••• (salvo — preencha para alterar)" : "destinatário do split"} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25" />
          <p className="text-xs leading-relaxed text-white/40">A conta que recebe a comissão; nunca é enviada ao navegador do tenant.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="platform-misticpay-commission-cents" className="text-xs font-bold uppercase tracking-wider text-white/55">Comissão fixa (centavos)</Label>
          <Input id="platform-misticpay-commission-cents" inputMode="numeric" value={commissionCents} onChange={(event) => setCommissionCents(event.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white" />
          <p className="text-xs leading-relaxed text-white/40">Padrão atual: 75 centavos (R$ 0,75).</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="platform-misticpay-commission-percent" className="text-xs font-bold uppercase tracking-wider text-white/55">Percentual informativo</Label>
          <Input id="platform-misticpay-commission-percent" inputMode="decimal" value={commissionPercent} onChange={(event) => setCommissionPercent(event.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white" />
          <p className="text-xs leading-relaxed text-white/40">Mantido para exibição administrativa; o split efetivo segue o contrato vigente.</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 p-4 lg:col-span-2">
          <div>
            <p className="font-bold text-white/85">Ativar Mistic Pay da plataforma</p>
            <p className="mt-1 text-xs text-white/40">A ativação não cria cobranças; apenas habilita a configuração global.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={pending} aria-label="Ativar Mistic Pay da plataforma" className="data-[checked]:bg-dashboard-accent" />
        </div>
      </div>

      <div className="relative flex flex-col gap-3 border-t border-white/10 bg-black/15 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="flex items-center gap-2 text-xs text-white/40"><KeyRound className="h-4 w-4 text-dashboard-accent" /> Somente administradores principais podem alterar estes dados.</div>
        <Button onClick={submit} disabled={pending} className="h-11 rounded-xl bg-dashboard-accent px-6 font-bold text-dashboard-bg hover:bg-[#C9DC9D]"><Save className="mr-2 h-4 w-4" />{pending ? "Salvando..." : "Salvar configuração global"}</Button>
      </div>
    </article>
  )
}
