"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveGatewaySettings } from "@/app/actions/settings"
import { toast } from "sonner"
import { CheckCircle2, ChevronDown, ChevronUp, Copy, Eye, KeyRound, LockKeyhole, Settings2, Webhook } from "lucide-react"
import Image from "next/image"

export function GatewayForm({
  provider,
  providerName,
  logoUrl,
  initial,
  maskedWebhookUrl,
  configured,
}: {
  provider: string
  providerName: string
  logoUrl: string
  initial: { publicKey: string; hasSecretKey: boolean }
  maskedWebhookUrl: string
  configured: boolean
}) {
  const [publicKey, setPublicKey] = useState(initial.publicKey)
  const [secretKey, setSecretKey] = useState("")
  const [pending, startTransition] = useTransition()
  const [isExpanded, setIsExpanded] = useState(provider === "veopag")
  const [copied, setCopied] = useState(false)

  function submit() {
    startTransition(async () => {
      try {
        await saveGatewaySettings({
          provider,
          publicKey,
          secretKey: secretKey.trim() || undefined,
        })
        setSecretKey("")
        toast.success(`Configurações de ${providerName} salvas`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar")
      }
    })
  }

  async function copyWebhook() {
    await navigator.clipboard.writeText(maskedWebhookUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
    toast.success("Endpoint copiado")
  }

  return (
    <article className="relative overflow-hidden rounded-[1.7rem] border border-fuchsia-400/20 bg-[radial-gradient(circle_at_10%_0%,rgba(236,72,153,0.13),transparent_32%),linear-gradient(145deg,rgba(25,12,31,0.98),rgba(12,10,18,0.98))] shadow-[0_18px_70px_rgba(168,40,150,0.12)]">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 p-5 md:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] border border-white/20 bg-gradient-to-br from-white/20 via-white/5 to-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_28px_rgba(236,72,153,0.24)] [transform:perspective(500px)_rotateY(-7deg)_rotateX(3deg)]">
              <div className="absolute inset-1 rounded-[1rem] border border-white/10" />
              <Image src={logoUrl} alt={providerName} fill sizes="76px" className="object-contain p-3" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">PIX</span>
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Gateway oficial</span>
              </div>
              <h3 className="truncate text-2xl font-black tracking-tight text-white">{providerName}</h3>
              <p className="mt-1 text-sm text-white/50">Processamento conectado à sua operação</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start">
            <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${configured ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-amber-300/20 bg-amber-300/10 text-amber-200"}`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {configured ? "Ativo" : "Configurar"}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} aria-label={isExpanded ? "Recolher gateway" : "Expandir gateway"} className="rounded-xl text-white/55 hover:bg-white/10 hover:text-white">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <KeyRound className="h-4 w-4 text-fuchsia-300" />
            <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-white/35">Credenciais</p>
            <p className="mt-1 text-sm font-semibold text-white/75">{initial.publicKey ? "Client ID salvo" : "Ainda não configurado"}</p>
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
        </div>
      </div>

      {isExpanded && (
        <div className="relative border-t border-white/10 bg-black/15 p-5 md:p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-bold text-white/80">
            <Settings2 className="h-4 w-4 text-fuchsia-300" />
            Configuração da integração
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${provider}-public`} className="text-xs font-bold uppercase tracking-wider text-white/50">Client ID</Label>
              <Input id={`${provider}-public`} placeholder="seu_client_id" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${provider}-secret`} className="text-xs font-bold uppercase tracking-wider text-white/50">Client Secret</Label>
              <Input id={`${provider}-secret`} type="password" autoComplete="new-password" placeholder={initial.hasSecretKey ? "•••••••• (salvo — preencha para alterar)" : `seu client_secret da ${providerName}`} value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/25" />
              <p className="text-xs leading-relaxed text-white/40">Gere as credenciais no painel oficial da {providerName}.{initial.hasSecretKey ? " Deixe em branco para manter o atual." : ""}</p>
            </div>
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor={`${provider}-webhook`} className="text-xs font-bold uppercase tracking-wider text-white/50">Endpoint de webhook</Label>
              <div className="flex gap-2">
                <Input id={`${provider}-webhook`} readOnly value={maskedWebhookUrl} aria-label={`Endpoint de webhook da ${providerName}`} className="h-11 min-w-0 rounded-xl border-white/10 bg-white/[0.04] font-mono text-xs text-white/65" />
                <Button type="button" variant="outline" size="icon" onClick={copyWebhook} aria-label="Copiar endpoint" className="h-11 w-11 shrink-0 rounded-xl border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/10 hover:text-white">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-white/40">O segredo de autenticação é mantido no servidor e não é exibido no navegador.</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-white/35"><Eye className="h-4 w-4" /> Revise os dados antes de salvar.</div>
            <Button onClick={submit} disabled={pending} className="h-11 rounded-xl bg-fuchsia-500 px-6 font-bold text-white shadow-[0_8px_24px_rgba(236,72,153,0.22)] hover:bg-fuchsia-400">{pending ? "Salvando..." : "Salvar configurações"}</Button>
          </div>
        </div>
      )}
    </article>
  )
}
