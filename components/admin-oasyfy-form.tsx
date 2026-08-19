"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, KeyRound, LockKeyhole, Save, ShieldCheck } from "lucide-react"
import { savePlatformOasyfySettings } from "@/app/actions/platform-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function AdminOasyfyForm({
  initial,
}: {
  initial: {
    configured: boolean
    enabled: boolean
    hasProducerId: boolean
    commissionCents: number
  }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [producerId, setProducerId] = useState("")
  const [enabled, setEnabled] = useState(initial.enabled)

  function submit() {
    startTransition(async () => {
      try {
        const result = await savePlatformOasyfySettings({
          producerId: producerId.trim() || undefined,
          enabled,
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        setProducerId("")
        toast.success("Configuração global Oasy.fy salva")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar")
      }
    })
  }

  return (
    <article className="relative overflow-hidden rounded-[1.5rem] border border-dashboard-accent/25 bg-[radial-gradient(circle_at_8%_0%,rgba(169,201,127,0.14),transparent_32%),linear-gradient(145deg,rgba(29,51,39,0.98),rgba(16,32,25,0.98))] shadow-[0_20px_70px_rgba(20,36,29,0.42)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-dashboard-accent/10 blur-3xl" />
      <div className="relative border-b border-white/10 p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-dashboard-accent">
              <ShieldCheck className="h-4 w-4" /> Control plane
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">Oasy.fy da plataforma</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Configuração exclusiva do administrador para o destino global do split. As credenciais Public Key e Secret Key continuam pertencendo a cada vendedor e não são exibidas aqui.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs font-bold text-white/70">
            {enabled && initial.configured ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <LockKeyhole className="h-4 w-4 text-amber-200" />}
            {enabled && initial.configured ? "Ativa" : "Desativada"}
          </div>
        </div>
      </div>

      <div className="relative grid gap-5 p-5 md:p-6 lg:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="platform-oasyfy-producer-id" className="text-xs font-bold uppercase tracking-wider text-white/55">producerId da plataforma</Label>
          <Input
            id="platform-oasyfy-producer-id"
            type="password"
            autoComplete="off"
            value={producerId}
            onChange={(event) => setProducerId(event.target.value)}
            placeholder={initial.hasProducerId ? "•••••••• (salvo — preencha para alterar)" : "producerId que recebe o split"}
            className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
          />
          <p className="text-xs leading-relaxed text-white/40">Cifrado no control plane e nunca retornado ao navegador do tenant. Deixe vazio para preservar o valor salvo.</p>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-white/55">Comissão do split</Label>
          <div className="flex h-11 items-center rounded-xl border border-white/10 bg-black/15 px-3 text-sm font-semibold text-white/80">R$ {(initial.commissionCents / 100).toFixed(2).replace(".", ",")} por cobrança</div>
          <p className="text-xs leading-relaxed text-white/40">Regra fixa da plataforma. Não pode ser alterada pelo tenant nem por este formulário.</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 p-4 lg:col-span-2">
          <div>
            <p className="font-bold text-white/85">Ativar Oasy.fy global</p>
            <p className="mt-1 text-xs text-white/40">A ativação apenas habilita o uso combinado com as credenciais do vendedor; não cria cobranças.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={pending} aria-label="Ativar Oasy.fy global" className="data-[checked]:bg-dashboard-accent" />
        </div>
      </div>

      <div className="relative flex flex-col gap-3 border-t border-white/10 bg-black/15 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="flex items-center gap-2 text-xs text-white/40"><KeyRound className="h-4 w-4 text-dashboard-accent" /> Somente o administrador principal pode alterar este destino.</div>
        <Button onClick={submit} disabled={pending} className="h-11 rounded-xl bg-dashboard-accent px-6 font-bold text-dashboard-bg hover:bg-[#C9DC9D]"><Save className="mr-2 h-4 w-4" />{pending ? "Salvando..." : "Salvar configuração global"}</Button>
      </div>
    </article>
  )
}
