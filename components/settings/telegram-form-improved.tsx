"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveTelegramSettings, registerTelegramWebhook } from "@/app/actions/settings"
import { getBotPreview, type BotPreview } from "@/app/actions/tg-preview"
import { autoDetectTelegramGroups, syncGroupToAudience } from "@/app/actions/tg-auto-detect"
import { toast } from "sonner"
import { Copy, Check, Bot, Loader2, Zap, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type DetectedGroup = {
  id: number
  title: string
  chatId: string
  type: string
  memberCount: number | null
  isAdmin: boolean
  missingPermissions: string[]
}

export function TelegramFormImproved({
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
  const [detecting, startDetect] = useTransition()
  const [copied, setCopied] = useState(false)
  
  // Preview state
  const [preview, setPreview] = useState<BotPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Auto-detect groups
  const [detectedGroups, setDetectedGroups] = useState<DetectedGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set())

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

  async function detectGroups() {
    startDetect(async () => {
      try {
        const result = await autoDetectTelegramGroups()
        if (result.ok && result.groups) {
          setDetectedGroups(result.groups)
          setSelectedGroups(new Set())
          toast.success(`${result.groupsCount} grupo(s) detectado(s)`)
        } else {
          toast.error(result.error || "Erro ao detectar grupos")
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao detectar grupos")
      }
    })
  }

  async function addGroupsToAudience() {
    if (selectedGroups.size === 0) {
      toast.error("Selecione pelo menos um grupo")
      return
    }

    startDetect(async () => {
      try {
        let successCount = 0
        for (const groupId of selectedGroups) {
          const result = await syncGroupToAudience(groupId)
          if (result.ok) successCount++
        }
        toast.success(`${successCount} grupo(s) adicionado(s) à divulgação`)
        setSelectedGroups(new Set())
        setDetectedGroups([])
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao adicionar grupos")
      }
    })
  }

  const toggleGroupSelection = (groupId: number) => {
    const newSelected = new Set(selectedGroups)
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId)
    } else {
      newSelected.add(groupId)
    }
    setSelectedGroups(newSelected)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Seção 1: Configuração do Token */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Token do Bot
          </CardTitle>
          <CardDescription>
            Insira o token gerado pelo @BotFather
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                  ✓ Bot Detectado
                </span>
              </div>
            </div>
          )}

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
              Endereço exclusivo desta loja que o Telegram chamará.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button 
              onClick={submit} 
              disabled={pending} 
              className="bg-primary text-black font-bold hover:bg-primary/90"
            >
              {pending ? "Salvando..." : "Salvar configurações"}
            </Button>
            <Button
              variant="secondary"
              onClick={connect}
              disabled={registering || !botConfigured}
            >
              {registering ? "Conectando..." : "Registrar webhook"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seção 2: Auto-detecção de Grupos */}
      {botConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Auto-detecção de Grupos
            </CardTitle>
            <CardDescription>
              Detecte automaticamente todos os grupos onde o bot é administrador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={detectGroups}
              disabled={detecting}
              className="w-full"
              variant="outline"
            >
              {detecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Detectando...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Detectar Grupos
                </>
              )}
            </Button>

            {detectedGroups.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium">
                  {detectedGroups.length} grupo(s) encontrado(s)
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {detectedGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => toggleGroupSelection(group.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.has(group.id)}
                        onChange={() => toggleGroupSelection(group.id)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{group.title}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {group.type}
                          </Badge>
                          {group.isAdmin && (
                            <Badge className="text-xs shrink-0 bg-green-500/20 text-green-400">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {group.memberCount ? `${group.memberCount} membros` : "Membros desconhecidos"}
                        </p>
                        {group.missingPermissions.length > 0 && (
                          <p className="text-xs text-yellow-400">
                            ⚠️ Faltam permissões: {group.missingPermissions.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedGroups.size > 0 && (
                  <Button
                    onClick={addGroupsToAudience}
                    disabled={detecting}
                    className="w-full"
                  >
                    {detecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      <>
                        Adicionar {selectedGroups.size} grupo(s) à Divulgação
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              💡 Dica: Adicione o bot aos grupos como administrador e ele detectará automaticamente.
              Não é necessário inserir IDs manualmente!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
