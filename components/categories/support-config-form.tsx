"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { saveSupportConfig, type SupportConfig } from "@/app/actions/categories"
import { toast } from "sonner"

export function SupportConfigForm({ initial }: { initial: SupportConfig }) {
  const [form, setForm] = useState<SupportConfig>(initial)
  const [pending, startTransition] = useTransition()

  function set<K extends keyof SupportConfig>(key: K, value: SupportConfig[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function submit() {
    startTransition(async () => {
      try {
        await saveSupportConfig(form)
        toast.success("Suporte salvo")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sup-label">Nome do botão no menu</Label>
          <Input
            id="sup-label"
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
            placeholder="💬 Suporte"
          />
        </div>
        <div className="grid gap-2">
          <Label>Exibir no bot</Label>
          <Select
            items={{ on: "Ativado", off: "Desativado" }}
            value={form.enabled ? "on" : "off"}
            onValueChange={(v) => set("enabled", v === "on")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on">Ativado</SelectItem>
              <SelectItem value="off">Desativado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sup-message">Mensagem de suporte</Label>
        <Textarea
          id="sup-message"
          rows={3}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Precisa de ajuda? Fale com o nosso suporte."
        />
        <p className="text-xs text-muted-foreground">
          Aceita tags HTML do Telegram (ex.:{" "}
          <code className="rounded bg-muted px-1">{"<b>texto</b>"}</code>).
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sup-tg">Username do Telegram</Label>
          <Input
            id="sup-tg"
            value={form.telegramUsername}
            onChange={(e) => set("telegramUsername", e.target.value)}
            placeholder="@suporte (sem link)"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sup-wa">URL do WhatsApp</Label>
          <Input
            id="sup-wa"
            value={form.whatsappUrl}
            onChange={(e) => set("whatsappUrl", e.target.value)}
            placeholder="https://wa.me/55..."
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sup-btn">Texto do botão de contato</Label>
          <Input
            id="sup-btn"
            value={form.buttonLabel}
            onChange={(e) => set("buttonLabel", e.target.value)}
            placeholder="📞 Falar com Suporte"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sup-hours">Horário de atendimento</Label>
          <Input
            id="sup-hours"
            value={form.hours}
            onChange={(e) => set("hours", e.target.value)}
            placeholder="Seg a Sex, 9h às 18h"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        O botão de contato usa o username do Telegram; se vazio, usa a URL do
        WhatsApp. Se nenhum for informado, apenas a mensagem é exibida.
      </p>

      <div>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Salvando..." : "Salvar suporte"}
        </Button>
      </div>
    </div>
  )
}
