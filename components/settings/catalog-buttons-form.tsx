"use client"

import { useState, useTransition } from "react"
import { ArrowLeft, Check, LayoutGrid, Save, ShoppingBag, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { saveCatalogSettings } from "@/app/actions/settings"
import { type CatalogConfig } from "@/lib/catalog-config"
import { toast } from "sonner"

const iconClass = "h-4 w-4 text-violet-300 drop-shadow-[0_0_8px_rgba(167,139,250,0.72)]"

type ButtonKey = "buyButton" | "couponButton" | "backButton"

const buttonMeta: Record<ButtonKey, { title: string; description: string; placeholder: string; icon: typeof ShoppingBag }> = {
  buyButton: {
    title: "Comprar",
    description: "Leva o cliente para o fluxo de compra.",
    placeholder: "Ex.: 🛍️ Comprar",
    icon: ShoppingBag,
  },
  couponButton: {
    title: "Cupom",
    description: "Permite aplicar um cupom promocional.",
    placeholder: "Ex.: 🎟️ Aplicar cupom",
    icon: Ticket,
  },
  backButton: {
    title: "Voltar",
    description: "Retorna o cliente para a etapa anterior.",
    placeholder: "Ex.: ⬅️ Voltar",
    icon: ArrowLeft,
  },
}

export function CatalogButtonsForm({ initial }: { initial: CatalogConfig }) {
  const [config, setConfig] = useState<CatalogConfig>(initial)
  const [pending, startTransition] = useTransition()

  function updateButton(key: keyof CatalogConfig, patch: Partial<{ text: string; enabled: boolean }>) {
    setConfig((prev: CatalogConfig) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function submit() {
    startTransition(async () => {
      try {
        await saveCatalogSettings(config)
        toast.success("Botões do catálogo atualizados")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-400/20">
          <LayoutGrid className={iconClass} />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">Navegação do catálogo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha quais ações ficam disponíveis nos menus do seu bot.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(buttonMeta) as ButtonKey[]).map((key) => {
          const meta = buttonMeta[key]
          const Icon = meta.icon
          const item = config[key]
          return (
            <div key={key} className="flex flex-col gap-4 rounded-2xl border border-violet-400/15 bg-violet-500/[0.035] p-4 transition-colors hover:border-violet-400/30 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/70 ring-1 ring-violet-400/15">
                    <Icon className={iconClass} />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-sm font-semibold">Botão {meta.title}</Label>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{meta.description}</p>
                  </div>
                </div>
                <Switch
                  aria-label={`Ativar botão ${meta.title}`}
                  checked={item.enabled}
                  onCheckedChange={(enabled) => updateButton(key, { enabled })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${key}-text`} className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Texto exibido</Label>
                <Input
                  id={`${key}-text`}
                  value={item.text}
                  onChange={(e) => updateButton(key, { text: e.target.value })}
                  placeholder={meta.placeholder}
                  className="bg-background/70"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Check className={item.enabled ? "h-3.5 w-3.5 text-violet-300" : "h-3.5 w-3.5 text-muted-foreground/40"} />
                {item.enabled ? "Visível no catálogo" : "Oculto no catálogo"}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end border-t border-border/60 pt-4">
        <Button onClick={submit} disabled={pending} className="w-full gap-2 sm:w-auto">
          <Save className="h-4 w-4" />
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </div>
  )
}
