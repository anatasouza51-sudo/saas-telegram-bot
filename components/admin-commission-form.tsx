"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Coins, Save, ShieldCheck } from "lucide-react"
import { savePlatformCommissionSettings } from "@/app/actions/platform-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AdminCommissionForm({
  initial,
}: {
  initial: { commissionCents: number; commissionPercent: string }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [commissionCents, setCommissionCents] = useState(String(initial.commissionCents))
  const [commissionPercent, setCommissionPercent] = useState(initial.commissionPercent)

  function submit() {
    startTransition(async () => {
      try {
        await savePlatformCommissionSettings({
          commissionCents: Number(commissionCents),
          commissionPercent: Number(commissionPercent),
        })
        toast.success("Política de comissão salva")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar")
      }
    })
  }

  return (
    <article className="relative overflow-hidden rounded-[1.5rem] border border-dashboard-accent-secondary/25 bg-[radial-gradient(circle_at_8%_0%,rgba(201,169,90,0.14),transparent_32%),linear-gradient(145deg,rgba(29,51,39,0.98),rgba(16,32,25,0.98))] shadow-[0_20px_70px_rgba(20,36,29,0.42)]">
      <div className="relative border-b border-white/10 p-5 md:p-6">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-dashboard-accent-secondary"><Coins className="h-4 w-4" /> Política interna</div>
        <h2 className="text-2xl font-black tracking-tight text-white">Comissão da plataforma</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Defina o valor administrativo usado no split. Esta tela é exclusiva do administrador e não revela o destinatário ao tenant.</p>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-2 md:p-6">
        <div className="grid gap-2">
          <Label htmlFor="commission-policy-cents" className="text-xs font-bold uppercase tracking-wider text-white/55">Valor fixo (centavos)</Label>
          <Input id="commission-policy-cents" inputMode="numeric" value={commissionCents} onChange={(event) => setCommissionCents(event.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white" />
          <p className="text-xs leading-relaxed text-white/40">Configuração inicial preservada: 75 centavos (R$ 0,75).</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="commission-policy-percent" className="text-xs font-bold uppercase tracking-wider text-white/55">Percentual informativo</Label>
          <Input id="commission-policy-percent" inputMode="decimal" value={commissionPercent} onChange={(event) => setCommissionPercent(event.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white" />
          <p className="text-xs leading-relaxed text-white/40">O backend continua usando cálculo inteiro em centavos.</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 bg-black/15 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="flex items-center gap-2 text-xs text-white/40"><ShieldCheck className="h-4 w-4 text-dashboard-accent" /> Alteração protegida por `settings.manage`.</div>
        <Button onClick={submit} disabled={pending} className="h-11 rounded-xl bg-dashboard-accent px-6 font-bold text-dashboard-bg hover:bg-[#C9DC9D]"><Save className="mr-2 h-4 w-4" />{pending ? "Salvando..." : "Salvar política"}</Button>
      </div>
    </article>
  )
}
