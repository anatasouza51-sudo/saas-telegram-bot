"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveGatewaySettings } from "@/app/actions/settings"
import { toast } from "sonner"
import { Copy, Check } from "lucide-react"

export function GatewayForm({
  initial,
  webhookUrl,
}: {
  initial: { publicKey: string; hasSecretKey: boolean }
  webhookUrl: string
}) {
  const [publicKey, setPublicKey] = useState(initial.publicKey)
  const [secretKey, setSecretKey] = useState("")
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  function submit() {
    startTransition(async () => {
      try {
        // Empty secret means "keep the one already stored on the server".
        await saveGatewaySettings({
          publicKey,
          secretKey: secretKey.trim() || undefined,
        })
        setSecretKey("")
        toast.success("Configurações do gateway salvas")
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
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="veo-public">Client ID</Label>
        <Input
          id="veo-public"
          placeholder="minhaloja_ABCD1234"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="veo-secret">Client Secret</Label>
        <Input
          id="veo-secret"
          type="password"
          autoComplete="new-password"
          placeholder={
            initial.hasSecretKey
              ? "•••••••• (salvo — preencha para alterar)"
              : "seu client_secret da VeoPag"
          }
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Gere o <strong>client_id</strong> e o <strong>client_secret</strong> em
          dashboard.veopag.com/credentials. Cada loja usa a sua própria conta.
          {initial.hasSecretKey
            ? " Deixe o segredo em branco para manter o atual."
            : ""}
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Webhook URL da sua loja</Label>
        <div className="flex items-center gap-2">
          <Input readOnly value={webhookUrl} className="font-mono text-xs" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyUrl}
            aria-label="Copiar URL"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure esta URL exclusiva no painel da VeoPag para receber
          confirmações automáticas de pagamento desta loja.
        </p>
      </div>

      <div>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </div>
  )
}
