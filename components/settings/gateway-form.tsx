"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveGatewaySettings } from "@/app/actions/settings"
import { toast } from "sonner"
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react"
import Image from "next/image"

export function GatewayForm({
  provider,
  providerName,
  logoUrl,
  initial,
  webhookUrl,
  maskedWebhookUrl,
}: {
  provider: string
  providerName: string
  logoUrl: string
  initial: { publicKey: string; hasSecretKey: boolean }
  webhookUrl: string
  maskedWebhookUrl: string
}) {
  const [publicKey, setPublicKey] = useState(initial.publicKey)
  const [secretKey, setSecretKey] = useState("")
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [showRealUrl, setShowRealUrl] = useState(false)
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

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="border rounded-lg overflow-hidden mb-4">
      <div 
        className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-8 flex items-center justify-center bg-background rounded border px-2 overflow-hidden">
            <Image 
              src={logoUrl} 
              alt={providerName} 
              fill 
              className="object-contain p-1"
            />
          </div>
          <span className="font-medium">{providerName}</span>
          {initial.publicKey && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Configurado
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="p-4 flex flex-col gap-4 border-t animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid gap-2">
            <Label htmlFor={`${provider}-public`}>Client ID</Label>
            <Input
              id={`${provider}-public`}
              placeholder="seu_client_id"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${provider}-secret`}>Client Secret</Label>
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
            />
            <p className="text-xs text-muted-foreground">
              Gere as credenciais no painel oficial da {providerName}.
              {initial.hasSecretKey ? " Deixe em branco para manter o atual." : ""}
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Webhook URL da sua loja</Label>
            <div className="flex items-center gap-2">
              <Input 
                readOnly 
                value={showRealUrl ? webhookUrl : maskedWebhookUrl} 
                className="font-mono text-xs" 
                onFocus={() => setShowRealUrl(true)}
                onBlur={() => setShowRealUrl(false)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyUrl}
                aria-label="Copiar URL"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure esta URL no painel da {providerName} para receber notificações.
            </p>
          </div>

          <div className="pt-2">
            <Button onClick={submit} disabled={pending}>
              {pending ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
