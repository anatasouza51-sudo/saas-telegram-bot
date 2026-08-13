"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveTelegramSettings, registerTelegramWebhook } from "@/app/actions/settings"
import { checkWebhookRegistration } from "@/app/actions/check-webhook"
import { getBotPreview, type BotPreview } from "@/app/actions/tg-preview"
import { autoDetectTelegramGroups, syncGroupToAudience } from "@/app/actions/tg-auto-detect"
import { DiagnosticsPanel } from "@/components/channels/diagnostics-panel"
import { toast } from "sonner"
import { Copy, Check, Bot, Loader2, Zap, Users, CircleCheck, AlertTriangle, RefreshCw } from "lucide-react"
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

export function TelegramForm({
  initial,
  webhookUrl,
  botConfigured,
}: {
  initial: {
    hasBotToken: boolean
    adminIds: string
    botIdentity: { name: string; username: string; photoUrl: string | null } | null
  }
  webhookUrl: string
  botConfigured: boolean
}) {
  const [botToken, setBotToken] = useState("")
  const [adminIds, setAdminIds] = useState(initial.adminIds)
  const [pending, startTransition] = useTransition()
  const [registering, startRegister] = useTransition()
  // Webhook mismatch guard: if Telegram's registered URL points at another
  // store, updates (and /start, buttons) never reach this shop silently.
  const [webhookMatches, setWebhookMatches] = useState<boolean | null>(null)
  const [webhookRegisteredUrl, setWebhookRegisteredUrl] = useState<string | null>(null)
  const [checkingWebhook, setCheckingWebhook] = useState(false)
  async function refreshWebhookStatus() {
    if (!botConfigured) return
    setCheckingWebhook(true)
    try {
      const res = await checkWebhookRegistration()
      if (res.ok) {
        setWebhookMatches(res.matches ?? false)
        setWebhookRegisteredUrl(res.registeredUrl ?? null)
      }
    } catch {
      // Best-effort diagnostics — never break the page on a check failure
    } finally {
      setCheckingWebhook(false)
    }
  }
  const [detecting, startDetect] = useTransition()
  const [copied, setCopied] = useState(false)
  
  // Preview state
  const [preview, setPreview] = useState<BotPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Auto-detect groups
  const [detectedGroups, setDetectedGroups] = useState<DetectedGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set())
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null)

  // Fetch bot preview when token changes
  useEffect(() => {
    refreshWebhookStatus()
  }, [botConfigured])

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
        await refreshWebhookStatus()
      } else {
        toast.error(res.error || "Falha ao registrar webhook")
      }
    })
  }

  function fixMismatchedWebhook() {
    connect()
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
          setDetectionMessage(
            result.groups.length === 0
              ? "Nenhum grupo conhecido foi encontrado. O Telegram não oferece uma lista completa de grupos; adicione o bot como administrador e envie uma mensagem no grupo, ou use o diagnóstico abaixo para verificar o webhook."
              : null,
          )
          if (result.groups.length > 0) {
            toast.success(`${result.groupsCount} grupo(s) detectado(s)`)
          } else {
            toast.info("Nenhum grupo conhecido encontrado. Veja as instruções abaixo.")
          }
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
    <div className="flex min-w-0 w-full max-w-full flex-col gap-6 overflow-x-hidden pl-3 sm:pl-4">
      <Card className="w-full min-w-0 max-w-full overflow-hidden border-primary/20 bg-primary/[0.03]">
        <CardContent className="p-5 md:p-6">
          <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 max-w-full items-start gap-3 sm:items-center sm:gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_18px_rgba(168,85,247,0.18)]">
                <Bot className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">
                    {preview?.name || initial.botIdentity?.name || "Meu bot do Telegram"}
                  </h2>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    webhookMatches === false
                      ? "bg-destructive/10 text-destructive"
                      : botConfigured
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {webhookMatches === false ? (
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : botConfigured ? (
                      <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : null}
                    {webhookMatches === false ? "Webhook precisa de atenção" : botConfigured ? "Bot configurado" : "Bot não configurado"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {webhookMatches === false
                    ? "O Telegram está apontando para outra URL. Corrija a conexão abaixo."
                    : botConfigured
                      ? "A integração está pronta para receber atualizações do Telegram."
                      : "Conecte um bot para começar a receber pedidos e mensagens."}
                </p>
              </div>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              {botConfigured && (
                <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={refreshWebhookStatus} disabled={checkingWebhook}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${checkingWebhook ? "animate-spin" : ""}`} aria-hidden="true" />
                  {checkingWebhook ? "Verificando..." : "Verificar conexão"}
                </Button>
              )}
              <Button type="button" size="sm" className="w-full sm:w-auto" onClick={connect} disabled={registering || !botConfigured}>
                {registering ? "Conectando..." : "Registrar webhook"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mismatch warning: the silent failure where Telegram keeps an old
          webhook registration pointing at another store's URL. */}
      {botConfigured && checkingWebhook && (
        <p className="text-xs text-muted-foreground">
          Verificando o status do webhook no Telegram...
        </p>
      )}
      {botConfigured && webhookMatches === false && (
        <div className="rounded-xl border border-destructive bg-destructive/10 p-4 space-y-2">
          <p className="font-bold text-destructive">
            ⚠️ O webhook do Telegram NÃO aponta para esta loja
          </p>
          <p className="text-sm text-muted-foreground break-all">
            O Telegram está entregando as mensagens a outra URL:{" "}
            <code className="text-xs">{webhookRegisteredUrl ?? "?"}</code>
          </p>
          <p className="text-sm text-muted-foreground">
            URL esperada desta loja:{" "}
            <code className="text-xs break-all">{webhookUrl}</code>
          </p>
          <p className="text-sm">
            É por isso que o bot não responde. Clique abaixo para registrar o
            webhook correto agora.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={fixMismatchedWebhook}
            disabled={registering}
            className="w-full bg-primary text-black font-bold hover:bg-primary/90 sm:w-auto"
          >
            {registering ? "Corrigindo..." : "Corrigir webhook (1 clique)"}
          </Button>
        </div>
      )}
      {/* Etapa 2: identidade e acesso do bot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Identidade e acesso
          </CardTitle>
          <CardDescription>
            Configure a conexão e confirme qual bot está vinculado a esta loja.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
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

          {/* Preview da identidade do bot */}
          {preview && (
            <div className="flex min-w-0 flex-col items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 shadow-[0_0_20px_rgba(168,85,247,0.08)] animate-in fade-in slide-in-from-top-2 sm:flex-row sm:items-center sm:gap-4">
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

          <div className="border-t border-border/60 pt-5">
            <div className="grid gap-2">
              <Label htmlFor="tg-admins">Administradores autorizados</Label>
            <Input
              id="tg-admins"
              placeholder="123456789, 987654321"
              value={adminIds}
              onChange={(e) => setAdminIds(e.target.value)}
            />
              <p className="text-xs text-muted-foreground">
                Informe os Telegram IDs autorizados a administrar este bot, separados por vírgula.
              </p>
            </div>
          </div>

          <div className="border-t border-border/60 pt-5">
            <div className="grid gap-2">
              <Label>Webhook da loja</Label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Input readOnly value={webhookUrl} className="min-w-0 font-mono text-xs" />
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
                Endereço exclusivo que o Telegram chamará para entregar eventos desta loja.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
            <Button 
              onClick={submit} 
              disabled={pending} 
              className="w-full bg-primary text-black font-bold hover:bg-primary/90 sm:w-auto"
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

      {/* Etapa 3: grupos, permissões e sincronização */}
      {botConfigured && (
        <Card className="overflow-hidden border-primary/15">
          <CardHeader className="border-b border-border/60 bg-primary/[0.03]">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Grupos e permissões
            </CardTitle>
            <CardDescription>
              Sincronize grupos conhecidos pelo webhook, confira as permissões do bot e escolha quais serão usados na divulgação.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4 pt-3">
            <Button
              onClick={detectGroups}
              disabled={detecting}
              className="w-full border-primary/30 text-primary hover:bg-primary/10"
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
                  Sincronizar grupos conhecidos
                </>
              )}
            </Button>

            {detectionMessage && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
                <p className="font-medium">Detecção sem grupos conhecidos</p>
                <p className="mt-1 leading-relaxed">{detectionMessage}</p>
              </div>
            )}

            <DiagnosticsPanel initial={null} />

            {detectedGroups.length > 0 && (
              <div className="space-y-3">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Grupos detectados</p>
                    <p className="text-xs text-muted-foreground">
                      {detectedGroups.length} grupo(s) encontrado(s)
                    </p>
                  </div>
                  {selectedGroups.size > 0 && (
                    <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                      {selectedGroups.size} selecionado(s)
                    </Badge>
                  )}
                </div>
                <div className="max-h-72 space-y-3 overflow-y-auto overflow-x-hidden pr-1">
                  {detectedGroups.map((group) => (
                    <div
                      key={group.id}
                      className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 transition-colors cursor-pointer ${selectedGroups.has(group.id) ? "border-primary/50 bg-primary/[0.06]" : "border-border hover:border-primary/30 hover:bg-primary/[0.03]"}`}
                      onClick={() => toggleGroupSelection(group.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.has(group.id)}
                        onChange={() => toggleGroupSelection(group.id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                          <span className="max-w-full break-words font-medium">{group.title}</span>
                          <Badge variant="secondary" className="max-w-full shrink-0 text-xs">
                            {group.type}
                          </Badge>
                          {group.isAdmin && (
                            <Badge className="max-w-full shrink-0 text-xs bg-primary/15 text-primary hover:bg-primary/15">
                              Administrador
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {group.memberCount ? `${group.memberCount} membros` : "Membros desconhecidos"}
                        </p>
                        {group.missingPermissions.length > 0 && (
                          <p className="break-words text-xs leading-relaxed text-amber-400">
                            Permissões pendentes: {group.missingPermissions.join(", ")}
                          </p>
                        )}
                        {group.missingPermissions.length === 0 && group.isAdmin && (
                          <p className="break-words text-xs leading-relaxed text-primary">Permissões necessárias disponíveis</p>
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
              Para um grupo já existente, adicione o bot como administrador e envie uma mensagem no grupo. O evento recebido pelo webhook criará o registro automaticamente; depois, use esta ação para revalidar permissões e membros dos grupos conhecidos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
