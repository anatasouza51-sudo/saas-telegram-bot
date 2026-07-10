"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveGatewaySettings } from "@/app/actions/settings"
import { toast } from "sonner"

export function GatewayForm({
  initial,
}: {
  initial: { webhookUrl: string; callbackUrl: string }
}) {
  const [webhookUrl, setWebhookUrl] = useState(initial.webhookUrl)
  const [callbackUrl, setCallbackUrl] = useState(initial.callbackUrl)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      try {
        await saveGatewaySettings({ webhookUrl, callbackUrl })
        toast.success("Configurações do gateway salvas")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="veo-webhook">Webhook URL (notificações de pagamento)</Label>
        <Input
          id="veo-webhook"
          placeholder="https://seuapp.com/api/veopag/webhook"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Configure esta URL no painel da VeoPag para receber confirmações
          automáticas de pagamento.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="veo-callback">Callback URL (retorno do cliente)</Label>
        <Input
          id="veo-callback"
          placeholder="https://seuapp.com/pagamento/retorno"
          value={callbackUrl}
          onChange={(e) => setCallbackUrl(e.target.value)}
        />
      </div>
      <div>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </div>
  )
}
