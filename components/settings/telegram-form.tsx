"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveTelegramSettings, registerTelegramWebhook } from "@/app/actions/settings"
import { getBotPreview, type BotPreview } from "@/app/actions/tg-preview"
import { toast } from "sonner"
import { Copy, Check, Bot, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function TelegramForm({
  initial,
  webhookUrl,
  botConfigured,
}: {
  initial: { hasBotToken: boolean; adminIds: string }
  webhookUrl: string
  botConfigured: boolean
}) {
  const [botToken, setBotToken] = useState("")
  const [adminIds, setAdminIds] = useState(initial.adminIds)
  const [pending, startTransition] = useTransition()
  const [registering, startRegister] = useTransition()
  const [copied, setCopied] = useState(false)
  
  // Preview state
  const [preview, setPreview] = useState<BotPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Fetch bot preview when token changes
  useEffect(() => {
    const token = botToken.trim()
    if (token && token.includes(":")) {
      const timer = setTimeout(async () => {
        setLoadingPreview(true)
        try {
          const info = await getBotPreview(token)
          setPreview(info)
        } catch (e) {
          setPreview(null)
        } finally {
          setLoadingPreview(false)
        }
      }, 500) // Debounce 500ms
      return () => clearTimeout(timer)
    } else {
      setPreview(null)
    }
  }, [botToken])

  function submit() {
    startTransition(async () => {
      try {
        const res = await saveTelegramSettings({
          botToken: botToken.trim() || undefined,
          adminIds,
        })
        setBotToken("")
        setPreview(null)
        if (res.webhookRegistered) {
          toast.success("Configurações salvas e bot conectado automaticamente")
        } else {
          toast.success("Configurações do Telegram salvas")
        }
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
    <div className="flex flex-col gap-6">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="tg-token">Token do Bot</Label>
          <div className="relative">
            <Input
              id="tg-token"
              type="password"
              autoComplete="new-password"
              placeholder={
                initial.hasBotToken
                  ? "•••••••• (salvo — preencha para alterar)"
                  : "123456:ABC-DEF..."
              }
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="pr-10"
            />
            {loadingPreview && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Token gerado pelo @BotFather. Cada loja usa o seu próprio bot.
            {initial.hasBotToken
              ? " Deixe em branco para manter o token atual."
              : ""}
          </p>
        </div>

        {/* Bot Preview Card */}
        {preview && (
          <div className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={preview.photoUrl || ""} alt={preview.name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                <Bot className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">{preview.name}</span>
              <span className="text-xs text-muted-foreground">@{preview.username}</span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-primary">Bot Detectado</span>
            </div>
          </div>
        )}
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
          Endereço exclusivo desta loja que o Telegram chamará. O webhook é
          registrado automaticamente ao salvar as configurações.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button onClick={submit} disabled={pending} className="bg-primary text-black font-bold hover:bg-primary/90">
          {pending ? "Salvando..." : "Salvar configurações (conecta bot)"}
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
