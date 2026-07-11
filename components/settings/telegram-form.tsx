"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveTelegramSettings, registerTelegramWebhook } from "@/app/actions/settings"
import { toast } from "sonner"
import { Copy, Check } from "lucide-react"

export function TelegramForm({
  initial,
  webhookUrl,
  botConfigured,
}: {
  initial: { adminIds: string }
  webhookUrl: string
  botConfigured: boolean
}) {
  // The bot token is never sent to the browser. Empty = keep the stored value.
  const [botToken, setBotToken] = useState("")
  const [adminIds, setAdminIds] = useState(initial.adminIds)
  const [pending, startTransition] = useTransition()
  const [registering, startRegister] = useTransition()
  const [copied, setCopied] = useState(false)

  function submit() {
    startTransition(async () => {
      try {
        await saveTelegramSettings({ botToken, adminIds })
        toast.success("Configurações do Telegram salvas")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar")
      }
    })
  }

  function connect() {
    startRegister(async () => {
      const res = await registerTelegramWebhook()
      if (res.ok) {
        toast.success("Webhook registrado no Telegram com sucesso")
      } else {
        toast.error(res.error || "Falha ao registrar webhook")
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
        <Label htmlFor="tg-token">Token do Bot</Label>
        <Input
          id="tg-token"
          type="password"
          autoComplete="new-password"
          placeholder={
            botConfigured
              ? "•••••••• (deixe em branco para manter)"
              : "123456:ABC-DEF..."
          }
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Token gerado pelo @BotFather. Por segurança, o token não é exibido
          novamente após salvo.
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
          Endereço exclusivo desta loja que o Telegram chamará. Salve o token e
          clique em &quot;Conectar bot&quot; para registrar automaticamente.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
        <Button
          variant="secondary"
          onClick={connect}
          disabled={registering || !botConfigured}
        >
          {registering ? "Conectando..." : "Conectar bot (registrar webhook)"}
        </Button>
      </div>
    </div>
  )
}
