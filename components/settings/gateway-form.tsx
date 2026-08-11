"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveGatewaySettings } from "@/app/actions/settings"
import { toast } from "sonner"
import { ChevronDown, ChevronUp } from "lucide-react"
import Image from "next/image"

export function GatewayForm({
  provider,
  providerName,
  logoUrl,
  initial,
  maskedWebhookUrl,
}: {
  provider: string
  providerName: string
  logoUrl: string
  initial: { publicKey: string; hasSecretKey: boolean }
  maskedWebhookUrl: string
}) {
  const [publicKey, setPublicKey] = useState(initial.publicKey)
  const [secretKey, setSecretKey] = useState("")
  const [pending, startTransition] = useTransition()
  const [isExpanded, setIsExpanded] = useState(provider === "veopag")

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

  return (
    <div className="border border-dashboard-border/30 rounded-xl overflow-hidden mb-3 bg-dashboard-card/50">
      <div 
        className="flex items-center justify-between p-3 md:p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <div className="relative w-20 h-8 md:w-24 md:h-10 flex-shrink-0 flex items-center justify-center bg-black/40 rounded-lg border border-white/10 px-2 overflow-hidden">
            <Image 
              src={logoUrl} 
              alt={providerName} 
              fill 
              className="object-contain p-1.5"
            />
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 min-w-0 overflow-hidden">
            <span className="font-bold text-sm md:text-base text-dashboard-text truncate">{providerName}</span>
            {initial.publicKey && (
              <span className="inline-flex w-fit text-[10px] md:text-xs font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Configurado
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-dashboard-text-muted flex-shrink-0 ml-2">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="p-4 flex flex-col gap-5 border-t border-dashboard-border/30 animate-in fade-in slide-in-from-top-2 duration-200 bg-black/20">
          <div className="grid gap-2">
            <Label htmlFor={`${provider}-public`} className="text-xs font-bold text-dashboard-text-muted uppercase tracking-wider">Client ID</Label>
            <Input
              id={`${provider}-public`}
              placeholder="seu_client_id"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              className="bg-dashboard-bg/50 border-dashboard-border/30"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${provider}-secret`} className="text-xs font-bold text-dashboard-text-muted uppercase tracking-wider">Client Secret</Label>
            <Input
              id={`${provider}-secret`}
              type="password"
              autoComplete="new-password"
              placeholder={
                initial.hasSecretKey
                  ? "•••••••• (salvo — preencha para alterar)"
                  : `seu client_secret da ${providerName}`
              }
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="bg-dashboard-bg/50 border-dashboard-border/30"
            />
            <p className="text-[10px] md:text-xs text-dashboard-text-muted leading-relaxed">
              Gere as credenciais no painel oficial da {providerName}.
              {initial.hasSecretKey ? " Deixe em branco para manter o atual." : ""}
            </p>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-bold text-dashboard-text-muted uppercase tracking-wider">Endpoint de webhook</Label>
            <Input
              readOnly
              value={maskedWebhookUrl}
              aria-label={`Endpoint de webhook da ${providerName}`}
              className="font-mono text-[10px] md:text-xs bg-dashboard-bg/50 border-dashboard-border/30"
            />
            <p className="text-[10px] md:text-xs text-dashboard-text-muted leading-relaxed">
              O webhook é configurado pelo servidor. O segredo de autenticação não é exibido no navegador.
            </p>
          </div>

          <div className="pt-2">
            <Button 
              onClick={submit} 
              disabled={pending}
              className="w-full md:w-auto bg-dashboard-accent hover:bg-dashboard-accent/90 text-white font-bold px-8"
            >
              {pending ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
