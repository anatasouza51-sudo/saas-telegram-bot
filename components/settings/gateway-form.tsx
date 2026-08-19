"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveGatewaySettings } from "@/app/actions/settings"
import { toast } from "sonner"
import { CheckCircle2, ChevronDown, ChevronUp, Copy, Eye, KeyRound, LockKeyhole, PowerOff, Settings2, Webhook } from "lucide-react"
import Image from "next/image"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function GatewayForm({
  provider,
  providerName,
  logoUrl,
  initial,
  maskedWebhookUrl,
  configured,
  enabled,
}: {
  provider: string
  providerName: string
  logoUrl: string
  initial: { publicKey: string; hasSecretKey: boolean; hasProducerId?: boolean; hasWebhookToken?: boolean }
  maskedWebhookUrl: string
  configured: boolean
  enabled: boolean
}) {
  const [publicKey, setPublicKey] = useState(initial.publicKey)
  const [secretKey, setSecretKey] = useState("")
  const [producerId, setProducerId] = useState("")
  const [webhookToken, setWebhookToken] = useState("")
  const isOasyfy = provider === "oasyfy"
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const isCompact = !configured && !enabled
  const [isExpanded, setIsExpanded] = useState(configured && enabled)
  const [copied, setCopied] = useState(false)
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false)

  function submit(nextEnabled = isEnabled) {
    startTransition(async () => {
      try {
        await saveGatewaySettings({
          provider,
          publicKey,
          secretKey: secretKey.trim() || undefined,
          producerId: isOasyfy ? producerId.trim() || undefined : undefined,
          webhookToken: isOasyfy ? webhookToken.trim() || undefined : undefined,
          enabled: nextEnabled,
        })

        setSecretKey("")
        setProducerId("")
        setWebhookToken("")
        setIsEnabled(nextEnabled)
        setConfirmDisableOpen(false)
        toast.success(nextEnabled ? `Gateway ${providerName} ativado` : `Gateway ${providerName} desativado`)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar")
      }
    })
  }

  function handleEnabledChange(nextValue: boolean) {
    if (!nextValue) {
      setConfirmDisableOpen(true)
      return
    }
    submit(true)
  }

  async function copyWebhook() {
    await navigator.clipboard.writeText(maskedWebhookUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
    toast.success("Endpoint copiado")
  }

  return (
    <article className={`relative overflow-hidden rounded-[1.35rem] border ${isCompact ? "border-dashboard-border bg-dashboard-surface shadow-[0_18px_60px_rgba(20,36,29,0.28)]" : "border-dashboard-accent/20 bg-[radial-gradient(circle_at_10%_0%,rgba(169,201,127,0.13),transparent_32%),linear-gradient(145deg,rgba(29,51,39,0.98),rgba(16,32,25,0.98))] shadow-[0_18px_70px_rgba(20,36,29,0.45)]"}`}>
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-dashboard-accent/10 blur-3xl" />
      <div className={`relative flex flex-col gap-5 ${isCompact ? "p-4 md:p-5" : "p-5 md:p-6"}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className={`relative shrink-0 items-center justify-center [transform:perspective(500px)_rotateY(-7deg)_rotateX(3deg)] ${isCompact ? "flex h-14 w-14" : "flex h-[68px] w-[68px]"}`}>
              {logoUrl ? <Image src={logoUrl} alt={providerName} fill sizes={isCompact ? "56px" : "68px"} className="object-contain" /> : <KeyRound className="h-8 w-8 text-dashboard-accent" />}
            </div>
            <div className="min-w-0">
              {!isCompact && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-dashboard-accent-secondary/25 bg-dashboard-accent-secondary/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-dashboard-accent-secondary">PIX</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Gateway oficial</span>
                </div>
              )}
              <h3 className={`truncate font-black tracking-tight text-white ${isCompact ? "text-lg" : "text-2xl"}`}>{providerName}</h3>
              <p className="mt-1 text-sm text-white/50">{isCompact ? "PIX e pagamentos" : "Processamento conectado à sua operação"}</p>
            </div>
          </div>
          {isCompact ? (
            <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
              <span className="rounded-full border border-slate-300/20 bg-slate-300/10 px-2.5 py-1 text-[10px] font-bold text-slate-300">Desativado</span>
              <Button type="button" onClick={() => setIsExpanded(!isExpanded)} disabled={pending} className="h-9 rounded-xl bg-white/10 px-3 text-xs font-bold text-white hover:bg-dashboard-accent hover:text-dashboard-bg">
                {isExpanded ? "Fechar" : "Configurar"}
              </Button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2 self-start">
              <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${!isEnabled ? "border-slate-300/20 bg-slate-300/10 text-slate-300" : configured ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-amber-300/20 bg-amber-300/10 text-amber-200"}`}>
                {!isEnabled ? <PowerOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {!isEnabled ? "Desativado" : configured ? "Ativo" : "Configurar"}
              </span>
              <Switch checked={isEnabled} onCheckedChange={handleEnabledChange} disabled={pending} aria-label={`${isEnabled ? "Desativar" : "Ativar"} gateway ${providerName}`} className="data-[checked]:bg-dashboard-accent" />
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} aria-label={isExpanded ? "Recolher gateway" : "Expandir gateway"} className="rounded-xl text-white/55 hover:bg-white/10 hover:text-white">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
          )}
        </div>

        {!isCompact && <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <KeyRound className="h-4 w-4 text-dashboard-accent" />
            <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-white/35">Credenciais</p>
            <p className="mt-1 text-sm font-semibold text-white/75">{initial.publicKey ? (isOasyfy ? "Public Key salva" : "Client ID salvo") : "Ainda não configurado"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <LockKeyhole className="h-4 w-4 text-emerald-300" />
            <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-white/35">Segurança</p>
            <p className="mt-1 text-sm font-semibold text-white/75">{initial.hasSecretKey ? "Chave protegida" : "Aguardando chave"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <Webhook className="h-4 w-4 text-sky-300" />
            <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-white/35">Webhook</p>
            <p className="mt-1 text-sm font-semibold text-white/75">Endpoint pronto</p>
          </div>
        </div>}
      </div>

      {isExpanded && (
        <div className="relative border-t border-white/10 bg-black/15 p-5 md:p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-bold text-white/80">
            <Settings2 className="h-4 w-4 text-dashboard-accent" />
            Configuração da integração
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${provider}-public`} className="text-xs font-bold uppercase tracking-wider text-white/50">{isOasyfy ? "Public Key (x-public-key)" : "Client ID"}</Label>
              <Input id={`${provider}-public`} placeholder={isOasyfy ? "sua_public_key" : "seu_client_id"} value={publicKey} onChange={(e) => setPublicKey(e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${provider}-secret`} className="text-xs font-bold uppercase tracking-wider text-white/50">{isOasyfy ? "Secret Key (x-secret-key)" : "Client Secret"}</Label>
              <Input id={`${provider}-secret`} type="password" autoComplete="new-password" placeholder={initial.hasSecretKey ? "•••••••• (salvo — preencha para alterar)" : isOasyfy ? "sua_secret_key" : `seu client_secret da ${providerName}`} value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25" />
              <p className="text-xs leading-relaxed text-white/40">A chave é cifrada no servidor e nunca é devolvida ao navegador.{initial.hasSecretKey ? " Deixe em branco para manter a atual." : ""}</p>
            </div>
            {isOasyfy && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor={`${provider}-producer`} className="text-xs font-bold uppercase tracking-wider text-white/50">producerId da plataforma</Label>
                  <Input id={`${provider}-producer`} type="password" autoComplete="off" placeholder={initial.hasProducerId ? "•••••••• (salvo — preencha para alterar)" : "producerId que recebe R$ 0,75"} value={producerId} onChange={(e) => setProducerId(e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25" />
                  <p className="text-xs leading-relaxed text-white/40">Identificador da conta recebedora do split fixo. Deixe em branco para manter o atual.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`${provider}-token`} className="text-xs font-bold uppercase tracking-wider text-white/50">Token do webhook da Oasy.fy <span className="normal-case font-normal text-white/30">(opcional)</span></Label>
                  <Input id={`${provider}-token`} type="password" autoComplete="new-password" placeholder={initial.hasWebhookToken ? "•••••••• (salvo — preencha para alterar)" : "token configurado na Oasy.fy"} value={webhookToken} onChange={(e) => setWebhookToken(e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25" />
                  <p className="text-xs leading-relaxed text-white/40">Quando informado, o callback exige também esse token antes de processar o evento.</p>
                </div>
              </>
            )}
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor={`${provider}-webhook`} className="text-xs font-bold uppercase tracking-wider text-white/50">Endpoint de webhook</Label>
              <div className="flex gap-2">
                <Input id={`${provider}-webhook`} readOnly value={maskedWebhookUrl} aria-label={`Endpoint de webhook da ${providerName}`} className="h-11 min-w-0 rounded-xl border-white/10 bg-white/[0.04] font-mono text-xs text-white/65" />
                <Button type="button" variant="outline" size="icon" onClick={copyWebhook} aria-label="Copiar endpoint" className="h-11 w-11 shrink-0 rounded-xl border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/10 hover:text-white">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-white/40">O segredo interno do endpoint é mantido no servidor e não é exibido no navegador.</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-white/35"><Eye className="h-4 w-4" /> Revise os dados antes de salvar.</div>
            <Button onClick={() => submit(isCompact ? true : undefined)} disabled={pending} className="h-11 rounded-xl bg-dashboard-accent px-6 font-bold text-dashboard-bg shadow-[0_8px_24px_rgba(169,201,127,0.22)] hover:bg-[#C9DC9D]">{pending ? "Salvando..." : isCompact ? "Salvar e ativar" : "Salvar configurações"}</Button>
          </div>
        </div>
      )}

      <Dialog open={confirmDisableOpen} onOpenChange={setConfirmDisableOpen}>
        <DialogContent className="border border-dashboard-accent/25 bg-dashboard-surface-elevated text-white shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white"><PowerOff className="h-5 w-5 text-amber-300" />Desativar o gateway {providerName}?</DialogTitle>
            <DialogDescription className="text-white/60">Novas cobranças PIX deixarão de ser iniciadas enquanto o gateway estiver desativado. As credenciais e o webhook serão preservados para uma futura reativação.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-white/10 bg-white/[0.03]">
            <DialogClose render={<Button variant="outline" className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white" />}>Cancelar</DialogClose>
            <Button onClick={() => submit(false)} disabled={pending} className="bg-amber-500 font-bold text-black hover:bg-amber-400">{pending ? "Desativando..." : "Confirmar desativação"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}
