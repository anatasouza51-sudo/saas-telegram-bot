"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { savePixSettings } from "@/app/actions/settings"
import type { PixConfig, PixButton } from "@/lib/pix-config"
import { toast } from "sonner"

export function PixSettingsForm({ initial }: { initial: PixConfig }) {
  const [config, setConfig] = useState<PixConfig>(initial)
  const [pending, startTransition] = useTransition()

  function update<K extends keyof PixConfig>(key: K, value: PixConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }))
  }

  function updateButton(
    key: "copyButton" | "verifyButton" | "cancelButton" | "supportButton",
    patch: Partial<PixButton>,
  ) {
    setConfig((c) => ({ ...c, [key]: { ...c[key], ...patch } }))
  }

  function submit() {
    startTransition(async () => {
      try {
        await savePixSettings(config)
        toast.success("Configurações de PIX salvas")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar")
      }
    })
  }

  const buttons: {
    key: "copyButton" | "verifyButton" | "cancelButton" | "supportButton"
    title: string
    help: string
  }[] = [
    {
      key: "copyButton",
      title: "Botão copiar código",
      help: "Ao tocar, copia o código PIX direto para a área de transferência.",
    },
    {
      key: "verifyButton",
      title: "Botão verificar pagamento",
      help: "Permite ao cliente conferir se o pagamento já foi aprovado.",
    },
    {
      key: "cancelButton",
      title: "Botão cancelar pedido",
      help: "Permite ao cliente cancelar um pedido ainda pendente.",
    },
    {
      key: "supportButton",
      title: "Botão de suporte",
      help: "Mostra um atalho para o suporte na mensagem de pagamento.",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-2">
        <Label htmlFor="pix-above">Texto acima do código PIX</Label>
        <Textarea
          id="pix-above"
          rows={2}
          value={config.aboveCodeText}
          onChange={(e) => update("aboveCodeText", e.target.value)}
          placeholder="Copie o código PIX abaixo e pague no app do seu banco:"
        />
        <p className="text-xs text-muted-foreground">
          Aparece logo acima do código &quot;Copia e Cola&quot;, no Telegram e na
          página de pagamento.
        </p>
      </div>

      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="pix-expire">Tempo de expiração (minutos)</Label>
        <Input
          id="pix-expire"
          type="number"
          min={5}
          max={1440}
          value={config.expireMinutes}
          onChange={(e) =>
            update("expireMinutes", Number(e.target.value) || 30)
          }
        />
        <p className="text-xs text-muted-foreground">
          Entre 5 e 1440 minutos. Usado na contagem regressiva do pagamento.
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Botões</h3>
          <p className="text-xs text-muted-foreground">
            Edite o texto de cada botão e use o interruptor para exibir ou
            ocultar.
          </p>
        </div>

        {buttons.map(({ key, title, help }) => (
          <div
            key={key}
            className="flex flex-col gap-2 rounded-lg border border-border p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`btn-${key}`} className="text-sm">
                {title}
              </Label>
              <Switch
                checked={config[key].enabled}
                onCheckedChange={(v) => updateButton(key, { enabled: v })}
                aria-label={`Ativar ${title}`}
              />
            </div>
            <Input
              id={`btn-${key}`}
              value={config[key].text}
              disabled={!config[key].enabled}
              onChange={(e) => updateButton(key, { text: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{help}</p>
          </div>
        ))}
      </div>

      <Separator />

      <div className="grid gap-2">
        <Label htmlFor="pix-approved">Mensagem após aprovação</Label>
        <Textarea
          id="pix-approved"
          rows={2}
          value={config.approvedMessage}
          onChange={(e) => update("approvedMessage", e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="pix-expired">Mensagem após expiração</Label>
        <Textarea
          id="pix-expired"
          rows={2}
          value={config.expiredMessage}
          onChange={(e) => update("expiredMessage", e.target.value)}
        />
      </div>

      <div>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações de PIX"}
        </Button>
      </div>
    </div>
  )
}
