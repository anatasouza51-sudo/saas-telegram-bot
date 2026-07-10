"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveTelegramSettings } from "@/app/actions/settings"
import { toast } from "sonner"

export function TelegramForm({
  initial,
}: {
  initial: { webhookUrl: string; adminIds: string }
}) {
  const [webhookUrl, setWebhookUrl] = useState(initial.webhookUrl)
  const [adminIds, setAdminIds] = useState(initial.adminIds)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      try {
        await saveTelegramSettings({ webhookUrl, adminIds })
        toast.success("Configurações do Telegram salvas")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="tg-webhook">Webhook URL</Label>
        <Input
          id="tg-webhook"
          placeholder="https://seuapp.com/api/telegram/webhook"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Endereço que o Telegram chamará para entregar as atualizações do bot.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tg-admins">IDs de administradores autorizados</Label>
        <Input
          id="tg-admins"
          placeholder="123456789, 987654321"
          value={adminIds}
          onChange={(e) => setAdminIds(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Somente estes Telegram IDs poderão acessar o painel administrativo do
          bot (separados por vírgula).
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
