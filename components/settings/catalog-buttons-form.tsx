"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { saveCatalogSettings } from "@/app/actions/settings"
import { type CatalogConfig } from "@/lib/catalog-config"
import { toast } from "sonner"
import { ShoppingBag, Ticket, ArrowLeft } from "lucide-react"

export function CatalogButtonsForm({
  initial,
}: {
  initial: CatalogConfig
}) {
  const [config, setConfig] = useState<CatalogConfig>(initial)
  const [pending, startTransition] = useTransition()

  function updateButton(key: keyof CatalogConfig, patch: Partial<{ text: string; enabled: boolean }>) {
    setConfig((prev: CatalogConfig) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
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
      <div className="grid gap-4">
        {/* Comprar */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <Label className="text-sm font-bold">Botão Comprar</Label>
            </div>
            <Switch
              checked={config.buyButton.enabled}
              onCheckedChange={(v) => updateButton("buyButton", { enabled: v })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="buy-text" className="text-[10px] uppercase tracking-widest text-muted-foreground">Texto e Emoji</Label>
            <Input
              id="buy-text"
              value={config.buyButton.text}
              onChange={(e) => updateButton("buyButton", { text: e.target.value })}
              placeholder="Ex.: 🛍️ Comprar"
              className="bg-white/5 border-white/10"
            />
          </div>
        </div>

        {/* Cupom */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              <Label className="text-sm font-bold">Botão Cupom</Label>
            </div>
            <Switch
              checked={config.couponButton.enabled}
              onCheckedChange={(v) => updateButton("couponButton", { enabled: v })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="coupon-text" className="text-[10px] uppercase tracking-widest text-muted-foreground">Texto e Emoji</Label>
            <Input
              id="coupon-text"
              value={config.couponButton.text}
              onChange={(e) => updateButton("couponButton", { text: e.target.value })}
              placeholder="Ex.: 🎟️ Aplicar Cupom"
              className="bg-white/5 border-white/10"
            />
          </div>
        </div>

        {/* Voltar */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 text-primary" />
              <Label className="text-sm font-bold">Botão Voltar</Label>
            </div>
            <Switch
              checked={config.backButton.enabled}
              onCheckedChange={(v) => updateButton("backButton", { enabled: v })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="back-text" className="text-[10px] uppercase tracking-widest text-muted-foreground">Texto e Emoji</Label>
            <Input
              id="back-text"
              value={config.backButton.text}
              onChange={(e) => updateButton("backButton", { text: e.target.value })}
              placeholder="Ex.: ⬅️ Voltar"
              className="bg-white/5 border-white/10"
            />
          </div>
        </div>
      </div>

      <Button onClick={submit} disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Salvar Configurações de Botões"}
      </Button>
    </div>
  )
}
